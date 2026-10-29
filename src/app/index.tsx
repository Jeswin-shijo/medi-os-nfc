import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Animated,
  Platform,
} from 'react-native';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { KioskHeader } from '../components/KioskHeader';
import { useKioskStore, Doctor, Department, PaymentMethod } from '../store/useKioskStore';
import { DEPARTMENTS, DOCTORS, MOCK_PATIENT } from '../services/mockData';
import NfcProxy from '../nfc/NfcProxy';

export default function KioskScreen() {
  const {
    step,
    setStep,
    patient,
    setPatient,
    selectedDept,
    setSelectedDept,
    selectedDoctor,
    setSelectedDoctor,
    paymentMethod,
    setPaymentMethod,
    currentTicket,
    setCurrentTicket,
    resetSession,
  } = useKioskStore();

  // Mobile / OTP state
  const [mobileNumber, setMobileNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [pulseAnim] = useState(new Animated.Value(1));
  const [writeUhid, setWriteUhid] = useState('PAT-1024');
  const [writeStatus, setWriteStatus] = useState('');

  // Setup passive NFC scanning when on WELCOME screen
  useEffect(() => {
    let active = true;

    async function initNfc() {
      const supported = await NfcProxy.init();
      if (!supported) return;

      if (step === 'WELCOME') {
        const tag = await NfcProxy.readNdefOnce();
        if (active && tag) {
          // In real hardware, read tag.id or decode NDEF payload
          setPatient(MOCK_PATIENT);
          setStep('PATIENT_CONFIRM');
        }
      }
    }

    initNfc();

    return () => {
      active = false;
      NfcProxy.cancelRequest();
    };
  }, [step]);

  // Pulse animation for NFC card area
  useEffect(() => {
    if (step === 'WELCOME') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [step]);

  // Handle simulated or physical NFC tap
  const handleSimulateNfcTap = () => {
    setPatient(MOCK_PATIENT);
    setStep('PATIENT_CONFIRM');
  };

  // Payment Confirmation & Ticket Generation
  const handleCompletePayment = (method: PaymentMethod) => {
    setPaymentMethod(method);
    setIsProcessingPayment(true);

    setTimeout(() => {
      setIsProcessingPayment(false);
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
      const randomSeq = Math.floor(1000 + Math.random() * 9000);
      const tokenNum = Math.floor(10 + Math.random() * 90);

      setCurrentTicket({
        opNumber: `OP-${dateStr}-${randomSeq}`,
        queueToken: `G-${tokenNum}`,
        patient: patient || MOCK_PATIENT,
        doctor: selectedDoctor || DOCTORS[0],
        paymentMethod: method,
        amount: selectedDoctor?.fee || 300,
        transactionId: `TXN${Date.now().toString().slice(-8)}`,
        timestamp: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });

      setStep('TICKET_DISPLAY');
    }, 1200);
  };

  // Card Writer Handler
  const handleWriteCard = async () => {
    setWriteStatus('Hold card near device to write...');
    const result = await NfcProxy.writeNdef({
      value: JSON.stringify({ uhid: writeUhid, hospital: 'st-marys' }),
    });
    if (result.success) {
      setWriteStatus(`Card successfully linked to UHID ${writeUhid}! (Tag ID: ${result.tagId || 'N/A'})`);
    } else {
      setWriteStatus('Failed or cancelled card write');
    }
  };

  return (
    <View style={styles.container}>
      <KioskHeader />

      <View style={styles.content}>
        {/* ============================================================== */}
        {/* 1. WELCOME SCREEN                                              */}
        {/* ============================================================== */}
        {step === 'WELCOME' && (
          <View style={styles.welcomeContainer}>
            <Text style={styles.welcomeTitle}>Welcome to AI Reception</Text>
            <Text style={styles.welcomeSubtitle}>
              Please select an option to check-in and get your Outpatient (OP) consultation ticket
            </Text>

            <View style={styles.cardOptionsGrid}>
              {/* Option 1: Tap NFC Card */}
              <Animated.View style={[styles.cardOptionWrapper, { transform: [{ scale: pulseAnim }] }]}>
                <TouchableOpacity
                  style={[styles.bigOptionCard, styles.nfcCard]}
                  onPress={handleSimulateNfcTap}
                  activeOpacity={0.8}
                >
                  <View style={styles.nfcIconBadge}>
                    <MaterialIcons name="nfc" size={54} color="#FFFFFF" />
                  </View>
                  <Text style={styles.cardOptionTitle}>Tap Your Patient Card</Text>
                  <Text style={styles.cardOptionBadge}>EXISTING PATIENT (FASTEST)</Text>
                  <Text style={styles.cardOptionDesc}>
                    Hold your hospital smart card against the scanner for instant 1-tap identification
                  </Text>
                  <View style={styles.tapActionPill}>
                    <Text style={styles.tapActionText}>Touch card to tap or click here</Text>
                  </View>
                </TouchableOpacity>
              </Animated.View>

              {/* Option 2: Forgot Card / Find My Record */}
              <TouchableOpacity
                style={styles.bigOptionCard}
                onPress={() => setStep('FORGOT_CARD')}
                activeOpacity={0.8}
              >
                <View style={[styles.nfcIconBadge, { backgroundColor: '#3B82F6' }]}>
                  <MaterialIcons name="phonelink-ring" size={48} color="#FFFFFF" />
                </View>
                <Text style={styles.cardOptionTitle}>Find My Record</Text>
                <Text style={[styles.cardOptionBadge, { backgroundColor: '#EFF6FF', color: '#1D4ED8' }]}>
                  FORGOT CARD
                </Text>
                <Text style={styles.cardOptionDesc}>
                  Enter your registered mobile number and verify via 6-digit SMS OTP
                </Text>
              </TouchableOpacity>

              {/* Option 3: New Patient */}
              <TouchableOpacity
                style={styles.bigOptionCard}
                onPress={() => {
                  setPatient({
                    id: 'new-1099',
                    uhid: 'PAT-NEW',
                    name: 'New Walk-In Patient',
                    age: 30,
                    gender: 'Male',
                    phone: '+91 98000 00000',
                  });
                  setStep('SELECT_DEPT');
                }}
                activeOpacity={0.8}
              >
                <View style={[styles.nfcIconBadge, { backgroundColor: '#10B981' }]}>
                  <MaterialIcons name="person-add-alt-1" size={48} color="#FFFFFF" />
                </View>
                <Text style={styles.cardOptionTitle}>New Patient</Text>
                <Text style={[styles.cardOptionBadge, { backgroundColor: '#ECFDF5', color: '#047857' }]}>
                  FIRST TIME VISIT
                </Text>
                <Text style={styles.cardOptionDesc}>
                  Register a new outpatient profile and get a medical queue token
                </Text>
              </TouchableOpacity>
            </View>

            {/* Bottom utility: Link card */}
            <View style={styles.kioskFooterRow}>
              <TouchableOpacity
                style={styles.writerLink}
                onPress={() => setStep('CARD_WRITER')}
              >
                <MaterialIcons name="edit-attributes" size={18} color={Colors.textMuted} />
                <Text style={styles.writerLinkText}>Staff Tool: Program / Link Blank NFC Card</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ============================================================== */}
        {/* 2. PATIENT CONFIRMED                                           */}
        {/* ============================================================== */}
        {step === 'PATIENT_CONFIRM' && patient && (
          <View style={styles.screenWrapper}>
            <View style={styles.successBanner}>
              <MaterialIcons name="check-circle" size={28} color="#FFFFFF" />
              <Text style={styles.successBannerText}>Patient Identified via NFC Smart Card</Text>
            </View>

            <View style={styles.profileCard}>
              <View style={styles.profileAvatar}>
                <MaterialIcons name="person" size={56} color={Colors.primary} />
              </View>

              <View style={styles.profileDetails}>
                <Text style={styles.patientName}>{patient.name}</Text>
                <View style={styles.metaRow}>
                  <Text style={styles.metaPill}>UHID: {patient.uhid}</Text>
                  <Text style={styles.metaPill}>
                    {patient.age} yrs | {patient.gender}
                  </Text>
                  <Text style={styles.metaPill}>Phone: {patient.phone}</Text>
                </View>
                {patient.lastVisit && (
                  <Text style={styles.lastVisitText}>
                    Last Hospital Consultation: {patient.lastVisit} (General Medicine)
                  </Text>
                )}
              </View>

              <View style={styles.profileAction}>
                <TouchableOpacity
                  style={styles.primaryActionButton}
                  onPress={() => setStep('SELECT_DEPT')}
                >
                  <Text style={styles.primaryActionText}>Continue to Doctor Booking</Text>
                  <MaterialIcons name="arrow-forward" size={24} color="#FFFFFF" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={resetSession}
                >
                  <Text style={styles.secondaryButtonText}>Not My Record</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* ============================================================== */}
        {/* 3. SELECT DEPARTMENT                                           */}
        {/* ============================================================== */}
        {step === 'SELECT_DEPT' && (
          <View style={styles.screenWrapper}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>1. Select Department</Text>
              <Text style={styles.sectionSubtitle}>
                Choose the clinical specialty for your outpatient consultation
              </Text>
            </View>

            <View style={styles.deptGrid}>
              {DEPARTMENTS.map((dept) => (
                <TouchableOpacity
                  key={dept.id}
                  style={[
                    styles.deptCard,
                    selectedDept?.id === dept.id && styles.deptCardActive,
                  ]}
                  onPress={() => {
                    setSelectedDept(dept);
                    setStep('SELECT_DOCTOR');
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.deptIconBox, { backgroundColor: dept.color + '15' }]}>
                    <MaterialIcons name={dept.icon as any} size={40} color={dept.color} />
                  </View>
                  <Text style={styles.deptName}>{dept.name}</Text>
                  <Text style={styles.deptDoctorCount}>
                    {DOCTORS.filter((d) => d.deptId === dept.id).length || 2} Doctors Available
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* ============================================================== */}
        {/* 4. SELECT DOCTOR                                               */}
        {/* ============================================================== */}
        {step === 'SELECT_DOCTOR' && (
          <View style={styles.screenWrapper}>
            <View style={styles.sectionHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <TouchableOpacity
                  style={styles.backIconButton}
                  onPress={() => setStep('SELECT_DEPT')}
                >
                  <MaterialIcons name="arrow-back" size={22} color={Colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.sectionTitle}>
                  2. Choose Doctor ({selectedDept?.name || 'General Medicine'})
                </Text>
              </View>
              <Text style={styles.sectionSubtitle}>
                Select an available physician to check current consultation fee and queue time
              </Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.doctorListScroll}>
              {DOCTORS.filter((d) => !selectedDept || d.deptId === selectedDept.id).map((doc) => (
                <TouchableOpacity
                  key={doc.id}
                  style={[
                    styles.doctorCard,
                    selectedDoctor?.id === doc.id && styles.doctorCardActive,
                  ]}
                  onPress={() => {
                    setSelectedDoctor(doc);
                    setStep('PAYMENT_MODE');
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.docAvatar}>
                    <MaterialIcons name="person" size={48} color={Colors.primary} />
                  </View>
                  <Text style={styles.docName}>{doc.name}</Text>
                  <Text style={styles.docQualifications}>{doc.qualifications}</Text>

                  <View
                    style={[
                      styles.availabilityBadge,
                      doc.availableStatus === 'now'
                        ? styles.availNow
                        : styles.availSoon,
                    ]}
                  >
                    <MaterialIcons
                      name={doc.availableStatus === 'now' ? 'check' : 'access-time'}
                      size={14}
                      color={doc.availableStatus === 'now' ? '#065F46' : '#92400E'}
                    />
                    <Text
                      style={[
                        styles.availText,
                        { color: doc.availableStatus === 'now' ? '#065F46' : '#92400E' },
                      ]}
                    >
                      {doc.availability}
                    </Text>
                  </View>

                  <View style={styles.feeContainer}>
                    <Text style={styles.feeLabel}>Consultation Fee</Text>
                    <Text style={styles.feeAmount}>₹{doc.fee}</Text>
                  </View>

                  <View style={styles.selectDocButton}>
                    <Text style={styles.selectDocButtonText}>Book Appointment</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ============================================================== */}
        {/* 5. SELECT PAYMENT MODE                                         */}
        {/* ============================================================== */}
        {step === 'PAYMENT_MODE' && selectedDoctor && (
          <View style={styles.screenWrapper}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>3. Select Payment Mode</Text>
              <Text style={styles.sectionSubtitle}>
                Pay consultation fee to generate your Outpatient ticket and queue token
              </Text>
            </View>

            <View style={styles.paymentSummaryCard}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Consulting Doctor</Text>
                <Text style={styles.summaryValue}>{selectedDoctor.name}</Text>
                <Text style={styles.summarySub}>{selectedDoctor.deptName}</Text>
              </View>

              <View style={styles.summaryDivider} />

              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Patient</Text>
                <Text style={styles.summaryValue}>{patient?.name || 'Walk-In Patient'}</Text>
                <Text style={styles.summarySub}>UHID: {patient?.uhid || 'PAT-NEW'}</Text>
              </View>

              <View style={styles.summaryDivider} />

              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Total Payable</Text>
                <Text style={styles.payableAmount}>₹{selectedDoctor.fee}</Text>
              </View>
            </View>

            <View style={styles.paymentMethodsRow}>
              {/* UPI */}
              <TouchableOpacity
                style={styles.paymentMethodCard}
                onPress={() => {
                  setPaymentMethod('UPI');
                  setStep('PAYMENT_PROCESS');
                }}
              >
                <View style={[styles.methodIconBox, { backgroundColor: '#EBF2FF' }]}>
                  <MaterialIcons name="qr-code-scanner" size={44} color={Colors.primary} />
                </View>
                <Text style={styles.methodTitle}>UPI QR Payment</Text>
                <Text style={styles.methodSubtitle}>Scan with GPay, PhonePe, Paytm</Text>
              </TouchableOpacity>

              {/* Cash with Staff */}
              <TouchableOpacity
                style={styles.paymentMethodCard}
                onPress={() => {
                  setPaymentMethod('CASH');
                  setStep('PAYMENT_PROCESS');
                }}
              >
                <View style={[styles.methodIconBox, { backgroundColor: '#ECFDF5' }]}>
                  <MaterialIcons name="payments" size={44} color="#10B981" />
                </View>
                <Text style={styles.methodTitle}>Cash at Counter</Text>
                <Text style={styles.methodSubtitle}>Reception staff collects & confirms</Text>
              </TouchableOpacity>

              {/* Card POS */}
              <TouchableOpacity
                style={styles.paymentMethodCard}
                onPress={() => {
                  setPaymentMethod('CARD');
                  setStep('PAYMENT_PROCESS');
                }}
              >
                <View style={[styles.methodIconBox, { backgroundColor: '#F5F3FF' }]}>
                  <MaterialIcons name="credit-card" size={44} color="#8B5CF6" />
                </View>
                <Text style={styles.methodTitle}>Card Payment</Text>
                <Text style={styles.methodSubtitle}>Debit / Credit card tap on POS</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ============================================================== */}
        {/* 6. PAYMENT PROCESSING                                          */}
        {/* ============================================================== */}
        {step === 'PAYMENT_PROCESS' && (
          <View style={styles.screenWrapper}>
            <View style={styles.paymentProcessBox}>
              {paymentMethod === 'UPI' && (
                <View style={styles.processContent}>
                  <Text style={styles.qrTitle}>Scan Dynamic QR to Pay ₹{selectedDoctor?.fee || 300}</Text>
                  <View style={styles.qrPlaceholder}>
                    <MaterialIcons name="qr-code-2" size={160} color={Colors.textPrimary} />
                  </View>
                  <Text style={styles.qrWaitingText}>
                    Awaiting UPI payment webhook confirmation...
                  </Text>
                  <TouchableOpacity
                    style={styles.simulatePayButton}
                    onPress={() => handleCompletePayment('UPI')}
                  >
                    <Text style={styles.simulatePayText}>Simulate Successful UPI Payment</Text>
                  </TouchableOpacity>
                </View>
              )}

              {paymentMethod === 'CASH' && (
                <View style={styles.processContent}>
                  <MaterialIcons name="local-atm" size={64} color="#10B981" />
                  <Text style={styles.qrTitle}>Pay ₹{selectedDoctor?.fee || 300} at Counter</Text>
                  <Text style={styles.qrWaitingText}>
                    Please hand the cash to Reception Desk 1. Staff will confirm receipt on their screen.
                  </Text>
                  <TouchableOpacity
                    style={[styles.simulatePayButton, { backgroundColor: '#10B981' }]}
                    onPress={() => handleCompletePayment('CASH')}
                  >
                    <Text style={styles.simulatePayText}>Staff Confirmed Cash Received</Text>
                  </TouchableOpacity>
                </View>
              )}

              {paymentMethod === 'CARD' && (
                <View style={styles.processContent}>
                  <MaterialIcons name="point-of-sale" size={64} color="#8B5CF6" />
                  <Text style={styles.qrTitle}>Tap or Insert Card on POS Terminal</Text>
                  <Text style={styles.qrWaitingText}>
                    Follow instructions on the connected Pine Labs / Razorpay POS terminal.
                  </Text>
                  <TouchableOpacity
                    style={[styles.simulatePayButton, { backgroundColor: '#8B5CF6' }]}
                    onPress={() => handleCompletePayment('CARD')}
                  >
                    <Text style={styles.simulatePayText}>Simulate POS Approval</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        )}

        {/* ============================================================== */}
        {/* 7. OP TICKET OUTPUT & PRINT                                    */}
        {/* ============================================================== */}
        {step === 'TICKET_DISPLAY' && currentTicket && (
          <View style={styles.screenWrapper}>
            <View style={styles.ticketSuccessContainer}>
              {/* Left Column: Digital Ticket Display */}
              <View style={styles.ticketLeftCol}>
                <View style={styles.printNotification}>
                  <MaterialIcons name="print" size={24} color="#10B981" />
                  <Text style={styles.printNotificationText}>
                    OP Ticket is being automatically printed on 80mm thermal printer
                  </Text>
                </View>

                {/* 80mm Printed Receipt Preview */}
                <View style={styles.receiptPreview}>
                  <Text style={styles.receiptHeader}>ST. MARY'S MULTI SPECIALITY HOSPITAL</Text>
                  <Text style={styles.receiptSubHeader}>OP REGISTRATION TICKET</Text>
                  <View style={styles.receiptDivider} />

                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptKey}>OP Number:</Text>
                    <Text style={styles.receiptVal}>{currentTicket.opNumber}</Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptKey}>Queue Token:</Text>
                    <Text style={[styles.receiptVal, styles.receiptToken]}>
                      {currentTicket.queueToken}
                    </Text>
                  </View>
                  <View style={styles.receiptDivider} />

                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptKey}>Patient Name:</Text>
                    <Text style={styles.receiptVal}>{currentTicket.patient.name}</Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptKey}>Patient ID:</Text>
                    <Text style={styles.receiptVal}>{currentTicket.patient.uhid}</Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptKey}>Department:</Text>
                    <Text style={styles.receiptVal}>{currentTicket.doctor.deptName}</Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptKey}>Doctor:</Text>
                    <Text style={styles.receiptVal}>{currentTicket.doctor.name}</Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptKey}>Consultation Fee:</Text>
                    <Text style={styles.receiptVal}>₹{currentTicket.amount} (PAID - {currentTicket.paymentMethod})</Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptKey}>Date & Time:</Text>
                    <Text style={styles.receiptVal}>{currentTicket.timestamp}</Text>
                  </View>

                  <View style={styles.receiptDivider} />
                  <Text style={styles.receiptFooter}>Please wait for your token number to be announced.</Text>
                  <Text style={styles.receiptFooter}>Thank you!</Text>
                </View>
              </View>

              {/* Right Column: Actions */}
              <View style={styles.ticketRightCol}>
                <View style={styles.bigTokenCard}>
                  <Text style={styles.bigTokenLabel}>YOUR QUEUE TOKEN</Text>
                  <Text style={styles.bigTokenNumber}>{currentTicket.queueToken}</Text>
                  <Text style={styles.bigTokenRoom}>Consultation {currentTicket.doctor.room}</Text>
                </View>

                <TouchableOpacity
                  style={styles.doneButton}
                  onPress={resetSession}
                >
                  <Text style={styles.doneButtonText}>Finish & Return to Home</Text>
                  <MaterialIcons name="done-all" size={24} color="#FFFFFF" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.reprintButton}
                  onPress={() => alert('Printing another copy of OP Ticket...')}
                >
                  <MaterialIcons name="replay" size={20} color={Colors.primary} />
                  <Text style={styles.reprintText}>Print Slip Again</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* ============================================================== */}
        {/* 8. FORGOT CARD / MOBILE + OTP                                  */}
        {/* ============================================================== */}
        {step === 'FORGOT_CARD' && (
          <View style={styles.screenWrapper}>
            <View style={styles.sectionHeader}>
              <TouchableOpacity
                style={styles.backIconButton}
                onPress={() => setStep('WELCOME')}
              >
                <MaterialIcons name="arrow-back" size={22} color={Colors.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.sectionTitle}>Find Patient Record</Text>
            </View>

            <View style={styles.forgotCardBox}>
              {!otpSent ? (
                <View style={{ width: 440 }}>
                  <Text style={styles.inputLabel}>Enter Registered Mobile Number</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. 9876543210"
                    keyboardType="phone-pad"
                    value={mobileNumber}
                    onChangeText={setMobileNumber}
                    maxLength={10}
                  />
                  <TouchableOpacity
                    style={styles.primaryActionButton}
                    onPress={() => setOtpSent(true)}
                  >
                    <Text style={styles.primaryActionText}>Send Verification OTP</Text>
                    <MaterialIcons name="sms" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={{ width: 440 }}>
                  <Text style={styles.inputLabel}>Enter 6-Digit OTP sent to +91 {mobileNumber || '9876543210'}</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter 6-digit code"
                    keyboardType="number-pad"
                    value={otp}
                    onChangeText={setOtp}
                    maxLength={6}
                  />
                  <TouchableOpacity
                    style={styles.primaryActionButton}
                    onPress={() => {
                      setPatient(MOCK_PATIENT);
                      setStep('PATIENT_CONFIRM');
                    }}
                  >
                    <Text style={styles.primaryActionText}>Verify OTP & Continue</Text>
                    <MaterialIcons name="check" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        )}

        {/* ============================================================== */}
        {/* 9. CARD WRITER TOOL                                            */}
        {/* ============================================================== */}
        {step === 'CARD_WRITER' && (
          <View style={styles.screenWrapper}>
            <View style={styles.sectionHeader}>
              <TouchableOpacity
                style={styles.backIconButton}
                onPress={() => setStep('WELCOME')}
              >
                <MaterialIcons name="arrow-back" size={22} color={Colors.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.sectionTitle}>NFC Smart Card Encoder & Linker</Text>
            </View>

            <View style={styles.forgotCardBox}>
              <View style={{ width: 480 }}>
                <Text style={styles.inputLabel}>Enter Patient UHID to Encode onto Card</Text>
                <TextInput
                  style={styles.textInput}
                  value={writeUhid}
                  onChangeText={setWriteUhid}
                  placeholder="e.g. PAT-1024"
                />

                <TouchableOpacity
                  style={[styles.primaryActionButton, { backgroundColor: '#1E6BFF' }]}
                  onPress={handleWriteCard}
                >
                  <MaterialIcons name="nfc" size={24} color="#FFFFFF" />
                  <Text style={styles.primaryActionText}>Hold Blank Card & Write Data</Text>
                </TouchableOpacity>

                {writeStatus !== '' && (
                  <View style={styles.writeStatusBox}>
                    <Text style={styles.writeStatusText}>{writeStatus}</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  welcomeContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 36,
  },
  cardOptionsGrid: {
    flexDirection: 'row',
    gap: 24,
    justifyContent: 'center',
    width: '100%',
    maxWidth: 1080,
  },
  cardOptionWrapper: {
    flex: 1,
  },
  bigOptionCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.border,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
  },
  nfcCard: {
    borderColor: '#3B82F6',
    backgroundColor: '#F8FAFF',
  },
  nfcIconBadge: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  cardOptionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 6,
    textAlign: 'center',
  },
  cardOptionBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
    backgroundColor: Colors.primaryLight,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
    marginBottom: 14,
  },
  cardOptionDesc: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  tapActionPill: {
    marginTop: 18,
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  tapActionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  kioskFooterRow: {
    marginTop: 32,
  },
  writerLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
  },
  writerLinkText: {
    color: Colors.textMuted,
    fontSize: 13,
  },
  screenWrapper: {
    flex: 1,
  },
  successBanner: {
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 20,
  },
  successBannerText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 28,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  profileAvatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileDetails: {
    flex: 1,
  },
  patientName: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
  },
  metaPill: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  lastVisitText: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  profileAction: {
    gap: 12,
  },
  primaryActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  secondaryButtonText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  sectionHeader: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  sectionSubtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  backIconButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deptGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
  },
  deptCard: {
    width: '31%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 22,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  deptCardActive: {
    borderColor: Colors.primary,
  },
  deptIconBox: {
    width: 64,
    height: 64,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  deptName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  deptDoctorCount: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  doctorListScroll: {
    flexDirection: 'row',
  },
  doctorCard: {
    width: 260,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 22,
    marginRight: 20,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  doctorCardActive: {
    borderColor: Colors.primary,
  },
  docAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  docName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  docQualifications: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 10,
    textAlign: 'center',
  },
  availabilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginBottom: 16,
  },
  availNow: {
    backgroundColor: '#D1FAE5',
  },
  availSoon: {
    backgroundColor: '#FEF3C7',
  },
  availText: {
    fontSize: 12,
    fontWeight: '700',
  },
  feeContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  feeLabel: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  feeAmount: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.primary,
  },
  selectDocButton: {
    backgroundColor: Colors.primary,
    width: '100%',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  selectDocButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  paymentSummaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 24,
  },
  summaryItem: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 13,
    color: Colors.textMuted,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  summarySub: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  summaryDivider: {
    width: 1,
    height: 48,
    backgroundColor: Colors.border,
    marginHorizontal: 20,
  },
  payableAmount: {
    fontSize: 26,
    fontWeight: '800',
    color: '#10B981',
  },
  paymentMethodsRow: {
    flexDirection: 'row',
    gap: 20,
  },
  paymentMethodCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 28,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.border,
  },
  methodIconBox: {
    width: 80,
    height: 80,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  methodTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  methodSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  paymentProcessBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  processContent: {
    alignItems: 'center',
    maxWidth: 480,
  },
  qrTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 20,
    textAlign: 'center',
  },
  qrPlaceholder: {
    width: 200,
    height: 200,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  qrWaitingText: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  simulatePayButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
  },
  simulatePayText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  ticketSuccessContainer: {
    flex: 1,
    flexDirection: 'row',
    gap: 32,
  },
  ticketLeftCol: {
    flex: 3,
  },
  printNotification: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
  },
  printNotificationText: {
    fontSize: 15,
    color: '#065F46',
    fontWeight: '600',
  },
  receiptPreview: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    padding: 24,
    maxWidth: 460,
  },
  receiptHeader: {
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
    color: Colors.textPrimary,
  },
  receiptSubHeader: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    color: Colors.textSecondary,
    marginBottom: 10,
  },
  receiptDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#CBD5E1',
    borderStyle: 'dashed',
    marginVertical: 10,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  receiptKey: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  receiptVal: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  receiptToken: {
    fontSize: 18,
    color: Colors.primary,
  },
  receiptFooter: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
  ticketRightCol: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  bigTokenCard: {
    backgroundColor: Colors.primary,
    borderRadius: 24,
    padding: 36,
    alignItems: 'center',
    width: '100%',
  },
  bigTokenLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  bigTokenNumber: {
    fontSize: 64,
    fontWeight: '900',
    color: '#FFFFFF',
    marginVertical: 10,
  },
  bigTokenRoom: {
    fontSize: 16,
    color: '#E0E7FF',
    fontWeight: '600',
  },
  doneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#10B981',
    width: '100%',
    paddingVertical: 18,
    borderRadius: 14,
  },
  doneButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  reprintButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reprintText: {
    color: Colors.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  forgotCardBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  textInput: {
    height: 56,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 18,
    backgroundColor: '#F8FAFC',
    marginBottom: 20,
  },
  writeStatusBox: {
    marginTop: 16,
    padding: 12,
    borderRadius: 10,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  writeStatusText: {
    fontSize: 14,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
});

