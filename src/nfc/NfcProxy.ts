import { Platform, Alert } from 'react-native';
import NfcManager, {
  NfcTech,
  Ndef,
  NfcEvents,
  NfcError,
  TagEvent,
} from 'react-native-nfc-manager';

class NfcProxy {
  private initialized = false;

  async init(): Promise<boolean> {
    try {
      const supported = await NfcManager.isSupported();
      if (supported && !this.initialized) {
        await NfcManager.start();
        this.initialized = true;
      }
      return supported;
    } catch (err) {
      console.warn('[NFC] Initialization failed:', err);
      return false;
    }
  }

  async isEnabled(): Promise<boolean> {
    try {
      return await NfcManager.isEnabled();
    } catch {
      return false;
    }
  }

  async goToNfcSetting(): Promise<void> {
    if (Platform.OS === 'android') {
      try {
        await NfcManager.goToNfcSetting();
      } catch (err) {
        console.warn('[NFC] Cannot navigate to settings:', err);
      }
    }
  }

  /**
   * Listen once for a tag discovery event.
   * Useful for passive scanning on the kiosk idle screen.
   */
  readNdefOnce(): Promise<TagEvent | null> {
    return new Promise((resolve) => {
      let tagFound: TagEvent | null = null;

      const cleanUp = () => {
        NfcManager.setEventListener(NfcEvents.DiscoverTag, null);
        NfcManager.setEventListener(NfcEvents.SessionClosed, null);
      };

      NfcManager.setEventListener(NfcEvents.DiscoverTag, (tag: TagEvent) => {
        tagFound = tag;
        cleanUp();
        if (Platform.OS === 'ios') {
          NfcManager.setAlertMessageIOS('Patient card detected');
        }
        NfcManager.unregisterTagEvent().catch(() => 0);
        resolve(tagFound);
      });

      NfcManager.setEventListener(NfcEvents.SessionClosed, () => {
        cleanUp();
        if (!tagFound) {
          resolve(null);
        }
      });

      NfcManager.registerTagEvent().catch((err) => {
        console.warn('[NFC] registerTagEvent error:', err);
        cleanUp();
        resolve(null);
      });
    });
  }

  /**
   * Request technology and read tag UID + NDEF status.
   */
  async readTag(): Promise<TagEvent | null> {
    let tag: TagEvent | null = null;
    try {
      await NfcManager.requestTechnology([NfcTech.Ndef, NfcTech.NfcA]);
      tag = await NfcManager.getTag();

      if (Platform.OS === 'ios') {
        await NfcManager.setAlertMessageIOS('Card read successfully');
      }
    } catch (ex) {
      if (!(ex instanceof NfcError.UserCancel)) {
        console.warn('[NFC] readTag exception:', ex);
      }
    } finally {
      await NfcManager.cancelTechnologyRequest().catch(() => 0);
    }
    return tag;
  }

  /**
   * Write NDEF message to card and link hardware UID.
   */
  async writeNdef({
    value,
    packageName = 'com.medios.reception',
  }: {
    value: string;
    packageName?: string;
  }): Promise<{ success: boolean; tagId?: string }> {
    let success = false;
    let tagId: string | undefined;

    try {
      await NfcManager.requestTechnology(NfcTech.Ndef, {
        alertMessage: 'Hold card against reader to write patient data',
      });

      const tag = await NfcManager.getTag();
      tagId = tag?.id;

      const bytes = Ndef.encodeMessage([
        Ndef.textRecord(value),
        Ndef.record(Ndef.TNF_EXTERNAL_TYPE, 'android.com:pkg', [], packageName),
      ]);

      if (bytes) {
        await NfcManager.ndefHandler.writeNdefMessage(bytes);
        if (Platform.OS === 'ios') {
          await NfcManager.setAlertMessageIOS('Card encoded successfully');
        }
        success = true;
      }
    } catch (ex) {
      if (!(ex instanceof NfcError.UserCancel)) {
        console.warn('[NFC] writeNdef error:', ex);
        Alert.alert('NFC Write Error', (ex as Error)?.message || 'Failed to write card');
      }
    } finally {
      await NfcManager.cancelTechnologyRequest().catch(() => 0);
    }

    return { success, tagId };
  }

  cancelRequest() {
    NfcManager.cancelTechnologyRequest().catch(() => 0);
    NfcManager.unregisterTagEvent().catch(() => 0);
  }
}

export default new NfcProxy();

