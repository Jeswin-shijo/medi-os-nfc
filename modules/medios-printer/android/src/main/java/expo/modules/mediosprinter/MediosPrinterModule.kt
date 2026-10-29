package expo.modules.mediosprinter

import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.hardware.usb.UsbConstants
import android.hardware.usb.UsbDevice
import android.hardware.usb.UsbEndpoint
import android.hardware.usb.UsbInterface
import android.hardware.usb.UsbManager
import android.os.Build
import android.util.Base64
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeoutOrNull
import java.io.IOException
import java.net.InetSocketAddress
import java.net.Socket
import kotlin.coroutines.resume

// Error codes reach JavaScript as `code` (inferred from the class name) next to a readable `message`.

/** ERR_PRINTER_NOT_FOUND */
class PrinterNotFoundException(message: String) : CodedException(message)

/** ERR_USB_PERMISSION */
class UsbPermissionException : CodedException("USB printer permission was not granted")

/** ERR_PRINT_FAILED */
class PrintFailedException(message: String, cause: Throwable? = null) : CodedException(message, cause)

/** Sends ready-made ESC/POS bytes to a slip printer over USB (Android USB host) or TCP (port 9100). */
class MediosPrinterModule : Module() {
  private val context: Context
    get() = appContext.reactContext?.applicationContext ?: throw Exceptions.ReactContextLost()

  private val usb: UsbManager
    get() = context.getSystemService(Context.USB_SERVICE) as UsbManager

  override fun definition() = ModuleDefinition {
    Name("MediosPrinter")

    // Coroutine bodies: blocking work moves to the IO dispatcher and waiting for the permission
    // dialog suspends, so the shared async-function thread is never held up.

    AsyncFunction("listUsbPrinters") Coroutine { ->
      withContext(Dispatchers.IO) {
        val usb = usb
        listPrinters(usb).map { port ->
          val allowed = usb.hasPermission(port.device)
          mapOf<String, Any?>(
            "deviceId" to port.device.deviceId,
            "name" to displayName(port.device),
            "vendorId" to port.device.vendorId,
            "productId" to port.device.productId,
            "hasPermission" to allowed,
            "printerClass" to (port.iface.interfaceClass == UsbConstants.USB_CLASS_PRINTER),
            // Android only shows the serial to an app it has allowed to use the device.
            "serial" to if (allowed) runCatching { port.device.serialNumber }.getOrNull() else null
          )
        }
      }
    }

    AsyncFunction("printUsb") Coroutine { deviceId: Int, base64: String ->
      printUsb(deviceId, decode(base64))
    }

    AsyncFunction("printNetwork") Coroutine { host: String, port: Int, base64: String, timeoutMs: Int ->
      printNetwork(host, port, decode(base64), timeoutMs)
    }
  }

  /** A printer, and the interface and bulk OUT endpoint the slip goes through. */
  private class PrinterPort(val device: UsbDevice, val iface: UsbInterface, val out: UsbEndpoint)

  /**
   * For the staff listing: devices with a printer-class (7) interface. When there is none, any
   * device with a bulk OUT endpoint (some cheap slip printers report a vendor-specific class), each
   * marked `printerClass: false`. Patients' slips only ever go to printer-class devices (`printUsb`).
   */
  private fun listPrinters(usb: UsbManager): List<PrinterPort> {
    val devices = usb.deviceList.values.sortedBy { it.deviceId }
    val printers = devices.mapNotNull { port(it, printerClassOnly = true) }
    return printers.ifEmpty { devices.mapNotNull { port(it, printerClassOnly = false) } }
  }

  private fun port(device: UsbDevice, printerClassOnly: Boolean): PrinterPort? {
    for (i in 0 until device.interfaceCount) {
      val iface = device.getInterface(i)
      if (printerClassOnly && iface.interfaceClass != UsbConstants.USB_CLASS_PRINTER) continue
      val out = (0 until iface.endpointCount)
        .map { iface.getEndpoint(it) }
        .firstOrNull { it.type == UsbConstants.USB_ENDPOINT_XFER_BULK && it.direction == UsbConstants.USB_DIR_OUT }
        ?: continue
      return PrinterPort(device, iface, out)
    }
    return null
  }

  private fun displayName(device: UsbDevice): String =
    listOfNotNull(device.manufacturerName, device.productName)
      .joinToString(" ")
      .trim()
      .ifEmpty { device.deviceName }

  /**
   * Prints to exactly this device, and only if it has a printer-class interface. Never picks
   * another device: JavaScript finds the chosen printer's current id (`resolveUsbPrinter`).
   */
  private suspend fun printUsb(deviceId: Int, data: ByteArray) {
    val usb = usb
    val device = usb.deviceList.values.firstOrNull { it.deviceId == deviceId }
      ?: throw PrinterNotFoundException("The USB printer is not connected")
    val port = port(device, printerClassOnly = true)
      ?: throw PrinterNotFoundException("That USB device is not a printer")
    if (!usb.hasPermission(port.device) && !requestPermission(usb, port.device)) {
      throw UsbPermissionException()
    }
    withContext(Dispatchers.IO) { send(usb, port, data) }
  }

  /** Shows Android's "Allow access" dialog and waits for the answer (30 s at most). */
  private suspend fun requestPermission(usb: UsbManager, device: UsbDevice): Boolean {
    val context = context
    val action = "${context.packageName}.USB_PRINTER_PERMISSION"
    val granted = withTimeoutOrNull(PERMISSION_TIMEOUT_MS) {
      suspendCancellableCoroutine { continuation ->
        val receiver = object : BroadcastReceiver() {
          override fun onReceive(received: Context, intent: Intent) {
            if (intent.action != action) return
            runCatching { context.unregisterReceiver(this) }
            if (continuation.isActive) {
              continuation.resume(intent.getBooleanExtra(UsbManager.EXTRA_PERMISSION_GRANTED, false))
            }
          }
        }
        val filter = IntentFilter(action)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
          context.registerReceiver(receiver, filter, Context.RECEIVER_NOT_EXPORTED)
        } else {
          context.registerReceiver(receiver, filter)
        }
        continuation.invokeOnCancellation { runCatching { context.unregisterReceiver(receiver) } }
        try {
          // Explicit (package set) and mutable: Android fills in the answer's extras.
          val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) PendingIntent.FLAG_MUTABLE else 0
          val intent = Intent(action).setPackage(context.packageName)
          usb.requestPermission(device, PendingIntent.getBroadcast(context, 0, intent, flags))
        } catch (e: Exception) {
          // The block threw, so no answer and no cancellation will ever unregister the receiver.
          runCatching { context.unregisterReceiver(receiver) }
          throw e
        }
      }
    }
    return granted == true
  }

  private fun send(usb: UsbManager, port: PrinterPort, data: ByteArray) {
    val connection = usb.openDevice(port.device) ?: throw PrintFailedException("The USB printer could not be opened")
    try {
      if (!connection.claimInterface(port.iface, true)) throw PrintFailedException("The USB printer is busy")
      try {
        var offset = 0
        while (offset < data.size) {
          val length = minOf(CHUNK_BYTES, data.size - offset)
          val sent = connection.bulkTransfer(port.out, data, offset, length, TRANSFER_TIMEOUT_MS)
          if (sent <= 0) throw PrintFailedException("The USB printer stopped answering")
          offset += sent
        }
      } finally {
        connection.releaseInterface(port.iface)
      }
    } finally {
      connection.close()
    }
  }

  private suspend fun printNetwork(host: String, port: Int, data: ByteArray, timeoutMs: Int) {
    if (host.isBlank()) throw PrinterNotFoundException("No printer address is set")
    if (port !in 1..65535) throw PrinterNotFoundException("The printer port $port is not valid")
    withContext(Dispatchers.IO) {
      try {
        Socket().use { socket ->
          socket.connect(InetSocketAddress(host, port), timeoutMs)
          socket.soTimeout = timeoutMs
          socket.getOutputStream().apply {
            write(data)
            flush()
          }
        }
      } catch (e: IOException) {
        throw PrintFailedException("The printer at $host:$port could not be reached", e)
      }
    }
  }

  private fun decode(base64: String): ByteArray =
    try {
      Base64.decode(base64, Base64.DEFAULT)
    } catch (e: IllegalArgumentException) {
      throw PrintFailedException("The slip could not be read", e)
    }

  private companion object {
    const val PERMISSION_TIMEOUT_MS = 30_000L
    const val TRANSFER_TIMEOUT_MS = 5_000
    /** Android's bulk transfer limit before API 28. */
    const val CHUNK_BYTES = 16 * 1024
  }
}
