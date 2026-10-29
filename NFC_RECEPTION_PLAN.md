# Hospital AI Reception Kiosk – Comprehensive Implementation Plan
**Project Location:** `/Users/jes/Documents/projects/Hospital Full stack/hospital nfc app`  
**System Name:** MediOS AI Reception Kiosk (CareSync Reception)  
**Target Device:** 10–11 inch Android Tablet (Landscape Kiosk Mode) + Native/External NFC + 80mm Thermal Printer  
**Target Backend:** NestJS 11 Backend (`/Users/jes/Documents/projects/Hospital Full stack/hospital backend`)  
**Demo Context:** St. Mary's Multi Speciality Hospital, Nagercoil, Tamil Nadu  

---

## 1. Executive Summary & Product Architecture

The **Hospital AI Reception Kiosk** is an autonomous, contactless Outpatient (OP) registration and ticketing kiosk for hospital front desks. It replaces human-dependent reception queues with an automated, multi-modal terminal:

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                         HOSPITAL AI RECEPTION KIOSK                              │
│                                                                                  │
│   [ 1. Identification ]  ──►  [ 2. Doctor/Dept ]  ──►  [ 3. Payment Mode ]       │
│   • Tap NFC Card (Fast)       • Select Dept            • UPI Dynamic QR          │
│   • Mobile + OTP (Forgot)     • Pick Doctor & Slot     • Cash (Staff Confirm)    │
│   • New Patient Register      • Review Fee (₹300)      • Card POS (Pine Labs)    │
│                                                                                  │
│                                      │                                           │
│                                      ▼                                           │
│                     [ 4. Verification & Token Engine ]                           │
│                     • Payment Gateway / POS Verified                             │
│                     • Generates OP No: OP-YYYYMMDD-XXXX                          │
│                     • Generates Queue Token: G-024 (Doctor-wise)                 │
│                                                                                  │
│                                      │                                           │
│                                      ▼                                           │
│                           [ 5. Output Dispatch ]                                 │
│                     • Digital Ticket on Tablet Screen                            │
│                     • Instant 80mm Thermal Print (ESC/POS)                       │
│                     • Live Queue Sync with Waiting Room Display                  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Hardware Architecture & Interfaces

| Component | Hardware Specification | Interface / Driver | Function in Kiosk |
| :--- | :--- | :--- | :--- |
| **Tablet Terminal** | 10"–11" Android Tablet (Android 11+) | React Native / Expo Native Build | Hosts Kiosk UI in immersive full-screen landscape |
| **NFC Reader** | Built-in Tablet NFC / USB HID / Bluetooth NFC | `react-native-nfc-manager` via `NfcProxy` | Reads patient card hardware UID / NDEF Patient ID |
| **Card POS Terminal** | Pine Labs / Razorpay Android Smart POS | App-to-App Intent / Local Webhook | Accepts Debit/Credit card payments & contactless tap |
| **Thermal Printer** | 80mm ESC/POS Printer (Ethernet LAN / USB / Bluetooth) | Direct TCP Socket (`react-native-tcp-socket`) / Bluetooth ESC-POS | Automatically cuts OP ticket with QR code & token |
| **Staff Terminal** | Front Desk PC / CareSync Mobile App | REST API (`/api/queue/cards`) | Staff cash payment confirmation & card reissuing |

---

## 3. End-to-End User Workflows

### Flow 1: NFC Tap & Express OP Registration (Standard Path)
1. **Idle State**: Tablet displays large pulsing "Tap Your Patient Card" banner with real-time clock.
2. **Card Tap**: NFC reader detects patient card:
   - Reads tag hardware UID or NDEF record containing `uhid` / `patientId`.
   - Plays haptic confirmation & acoustic chime.
   - Calls `POST /api/queue/cards/tap` or `GET /api/patients/by-card/:cardId`.
3. **Patient Identification**:
   - Shows patient photo/avatar, Full Name (e.g., *Ramesh Kumar*), UHID (`PAT-1024`), Age/Sex (*45 / Male*).
   - "Patient Identified" green badge displayed with "Continue" button.
4. **Select Department**:
   - Visual grid of hospital departments (General Medicine, Pediatrics, Cardiology, Orthopedics, Gynecology, Dermatology).
5. **Choose Doctor**:
   - Shows doctor list with photo, specialty, consultation fee (₹300), and real-time availability status (*Available Now*, *In 20 mins*, *At 11:30 AM*).
6. **Payment Mode Selection**:
   - Screen summarizes: Doctor Name, Department, Consultation Fee.
   - Options: **UPI Scan QR**, **Cash (Staff Confirm)**, **Card (POS Terminal)**.
7. **Payment & Verification**:
   - **UPI**: Generates dynamic QR code on screen; polls backend order status every 2 seconds until paid.
   - **Cash**: Prompts front-desk staff notification; staff clicks "Confirm Cash Received" on their dashboard.
   - **Card POS**: Dispatches payment request to Pine Labs / Razorpay POS.
8. **Ticket & Token Generation**:
   - Backend assigns unique OP Number (`OP-20261029-0042`) and Doctor Queue Token (`G-024`).
   - Digital ticket displayed on screen.
   - Silent print command sent to 80mm thermal printer.
   - Auto-reset countdown (10s) returns kiosk to Welcome screen.

---

### Flow 2: Forgot Card (Mobile Number + OTP Authentication)
1. Patient taps **"Find My Record (Forgot Card)"** on Welcome screen.
2. **Mobile Entry**: On-screen large numeric keypad to enter registered 10-digit mobile number (`+91 98765 43210`).
3. **OTP Verification**:
   - System calls `POST /api/auth/otp/send`.
   - Patient enters 6-digit OTP received via SMS.
   - Auto-submits on 6th digit; 30-second resend countdown timer.
4. **Record Found**:
   - Displays patient profile with confirmation prompt (*"Is this you?"*).
5. Patient continues through standard Department -> Doctor -> Payment -> OP Ticket.
6. **Card Reissue Prompt**: At ticket completion screen, displays optional prompt: *"Collect a new NFC Smart Card from Reception counter for faster 1-tap check-in next time."*

---

### Flow 3: First-Time Patient (New Registration)
1. Patient taps **"New Patient (First Time Visit)"**.
2. Minimal fast intake form:
   - Full Name, Mobile Number, Gender, Age / DOB.
3. System assigns new `UHID`, then routes directly to Doctor selection and Payment.
4. Kiosk prints OP Ticket and prompts patient to collect their programmed NFC card from Counter 1.

---

## 4. UI Screen Specifications & Design System

The app will follow a **touch-first, high-contrast, premium hospital kiosk design system** optimized for 1280x800 / 1920x1200 landscape tablets:

```
┌────────────────────────────────────────────────────────────────────────────────────┐
│ [🏥 St. Mary's Multi Speciality Hospital]               [Tue, 29 Oct 2026  10:24 AM]│
├────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                    │
│                          WELCOME TO AI RECEPTION                                   │
│                        Select an option to proceed                                 │
│                                                                                    │
│    ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐            │
│    │     (( 💳 ))     │    │     🔍 📱        │    │      ➕ 👤       │            │
│    │  TAP PATIENT     │    │  FIND MY RECORD  │    │   NEW PATIENT    │            │
│    │      CARD        │    │   (Forgot Card)  │    │  (First Visit)   │            │
│    │                  │    │                  │    │                  │            │
│    │  Fastest 1-Tap   │    │   Mobile + OTP   │    │   Quick Intake   │            │
│    └──────────────────┘    └──────────────────┘    └──────────────────┘            │
│                                                                                    │
├────────────────────────────────────────────────────────────────────────────────────┤
│ [?] Need Assistance? Tap here to call Reception Staff              [English / தமிழ்]│
└────────────────────────────────────────────────────────────────────────────────────┘
```

### Color Palette & Design Tokens
- **Primary Brand**: `#1E6BFF` (Hospital Medical Blue)
- **Accent / Success**: `#10B981` (Verification Emerald)
- **Warning / Pending**: `#F59E0B` (Amber status)
- **Background**: `#F8FAFC` (Clean slate / hospital light)
- **Surface Cards**: `#FFFFFF` with `0 4px 20px rgba(0, 0, 0, 0.06)` elevation
- **Typography**: Large legible sans-serif (`Inter` / `Outfit`), minimum 20pt for primary buttons, high touch-target radius (minimum 64px touch area).

---

## 5. Technical Implementation in `hospital nfc app`

### A. Technology Stack
- **Framework**: React Native with Expo SDK 52+ (Custom Dev Client / Prebuilt for native NFC)
- **Language**: TypeScript 5+
- **NFC Engine**: `react-native-nfc-manager` (incorporating `NfcProxy` abstraction from `sodisys-nfc-app`)
- **Thermal Printing**: `react-native-esc-pos-printer` or direct raw socket ESC/POS generator
- **State Management**: `zustand` (lightweight state machine for Kiosk steps and session timeouts)
- **Networking**: `axios` with interceptors and retry policies
- **Icons & Graphics**: `@expo/vector-icons` (MaterialIcons / Feather) & SVG illustrations

---

### B. Project Directory Structure
```
hospital nfc app/
├── app.json                     # Expo configuration with NFC config plugin
├── package.json                 # Dependencies & scripts
├── tsconfig.json
├── index.js                     # Native entry point
├── src/
│   ├── api/                     # Backend communication
│   │   ├── client.ts            # Axios instance pointing to NestJS backend
│   │   ├── patientApi.ts        # Patient lookup by card / phone / OTP
│   │   ├── doctorApi.ts         # Departments, doctors, availability & fees
│   │   ├── paymentApi.ts        # UPI QR generation, status polling, POS trigger
│   │   └── queueApi.ts          # OP registration & token issue
│   ├── nfc/                     # NFC abstraction layer
│   │   ├── NfcProxy.ts          # Singleton adapted from Sodisys (start, read, write)
│   │   ├── nfcDecoder.ts        # NDEF parser & hardware UID extractor
│   │   └── useNfcListener.ts    # React hook for kiosk auto-scan lifecycle
│   ├── printer/                 # Thermal printer integration
│   │   ├── escpos.ts            # 80mm ESC/POS ticket byte generator
│   │   ├── printService.ts      # TCP / USB / Bluetooth socket dispatcher
│   │   └── ticketTemplate.ts    # MediOS AI OP Ticket Layout
│   ├── store/
│   │   └── useKioskStore.ts     # Kiosk session state (patient, doctor, fee, payment)
│   ├── components/              # Touch-optimized kiosk components
│   │   ├── KioskHeader.tsx      # Hospital branding, clock, language toggle
│   │   ├── LargeButton.tsx      # Big touch cards with icons
│   │   ├── NumericKeypad.tsx    # Mobile number & OTP on-screen keypad
│   │   ├── CountdownTimer.tsx   # Auto-reset inactivity timer
│   │   └── StatusModal.tsx      # Success / error / waiting overlays
│   └── screens/
│       ├── 01_WelcomeScreen.tsx        # Idle screen with NFC listener
│       ├── 02_PatientConfirmScreen.tsx # Display verified patient profile
│       ├── 03_DepartmentScreen.tsx     # Department selector grid
│       ├── 04_DoctorSelectScreen.tsx   # Doctor list with fees & availability
│       ├── 05_PaymentModeScreen.tsx    # UPI / Cash / Card selector
│       ├── 06_PaymentProcessScreen.tsx # Dynamic UPI QR / Staff cash / POS terminal
│       ├── 07_TicketSuccessScreen.tsx  # OP Ticket preview & auto-print trigger
│       ├── 08_ForgotCardScreen.tsx     # Mobile number input + OTP verification
│       └── 09_CardWriterScreen.tsx     # Admin / Staff screen to link card to UHID
```

---

### C. Reusable NFC Engine (`NfcProxy.ts`)
Adapted from the proven `sodisys-nfc-app` architecture:
1. **Continuous Tag Discovery**:
   - Kiosk runs a non-blocking background tag listener on the Welcome screen.
   - When a card is brought within range, `DiscoverTag` fires without requiring the user to press a button.
2. **Dual-Mode Tag Resolution**:
   - Mode 1: **Hardware Tag UID (CSN)** – queries `/api/queue/cards` to match serial number to `uhid`.
   - Mode 2: **NDEF Text Payload** – decodes JSON payload `{"uhid": "PAT-1024", "hospital": "st-marys"}` for offline/fast-path validation.
3. **Safe Clean-up**:
   - `cancelTechnologyRequest()` in `finally` blocks prevents NFC adapter deadlocks.

---

### D. 80mm Thermal Receipt Ticket Schema

The printed ticket adheres strictly to the sample layout provided in the specification:

```
=========================================
      CITY CARE MULTI SPECIALITY HOSPITAL
              OP REGISTRATION TICKET
=========================================
OP Number      : OP-20261029-0042
Queue Token    : G-024
-----------------------------------------
Patient Name   : Ramesh Kumar
Patient ID     : PAT-1024
Age / Sex      : 45 / Male
Department     : General Medicine
Doctor         : Dr. Arun Kumar, MBBS, MD
Consultation Fee: Rs. 300 (PAID - UPI)
Date & Time    : 29-10-2026 10:24 AM
-----------------------------------------
                [  QR CODE  ]
        (Scan to track live queue on phone)

      Please wait for your token number.
                  Thank you!
=========================================
```

---

## 6. Implementation Roadmap & Phased Execution

### Phase 1: Project Setup & Kiosk Shell (Day 1)
- [ ] Initialize Expo app in `/Users/jes/Documents/projects/Hospital Full stack/hospital nfc app` with TypeScript.
- [ ] Configure `app.json` with `react-native-nfc-manager` config plugin.
- [ ] Implement landscape orientation lock and full-screen kiosk theme.
- [ ] Setup Axios client connecting to `http://localhost:4000/api` (MediOS backend).

### Phase 2: NFC Proxy & Tag Engine (Day 2)
- [ ] Port and modernize `NfcProxy` from `sodisys-nfc-app` into TypeScript.
- [ ] Implement `useNfcListener` hook for passive idle-state scanning.
- [ ] Add card UID resolution API connecting to backend `queue.cards.tap`.
- [ ] Add sound effect / haptic feedback upon successful card read.

### Phase 3: Core Patient Journey Screens (Day 3)
- [ ] **Welcome Screen**: Triple-choice card (NFC Tap, Find Record, New Patient).
- [ ] **Patient Confirmation Screen**: Show patient data, previous visit date, UHID.
- [ ] **Department & Doctor Screen**: Fetch real-time doctors, specialty badges, consultation fees, and availability slots from NestJS backend.

### Phase 4: Payment Integrations (Day 4)
- [ ] **Dynamic UPI QR Code**: Generate BharatQR / UPI intent string (`upi://pay?pa=...&am=300`) with countdown timer and automated status polling.
- [ ] **Cash Payment Flow**: Trigger websocket/notification to reception desk for staff cash confirmation.
- [ ] **Card POS Terminal**: Build mock and Pine Labs intent bridge for POS payment confirmation.

### Phase 5: OP Ticket Generation & Thermal Printing (Day 5)
- [ ] Backend endpoint integration to generate token (`POST /api/queue/tokens`).
- [ ] Digital OP Ticket view on tablet screen.
- [ ] 80mm ESC/POS ticket layout generator with embedded queue tracking QR code.
- [ ] Direct print trigger via LAN printer IP / Bluetooth.

### Phase 6: Forgot Card (OTP) & Card Writer Module (Day 6)
- [ ] Mobile number keypad & OTP verification screen.
- [ ] Patient matching logic.
- [ ] Card Reissuance / Writing tool: Admin screen to tap a blank NTAG/Mifare card and write/link patient UHID to card.

### Phase 7: Kiosk Hardening & Offline Resilience (Day 7)
- [ ] 30-second inactivity watchdog: auto-resets kiosk back to Welcome screen if patient abandons session.
- [ ] Touch debouncing to prevent duplicate token creation or double charges.
- [ ] Local print queue buffer: retries print if printer runs out of paper.
- [ ] Full end-to-end testing with physical NFC cards and backend database.

---

## 7. Immediate Next Steps

1. **Review and Approve Plan**: Confirm the architecture, workflow steps, and payment modes.
2. **Execute Scaffolding**: Bootstrap the app in `/Users/jes/Documents/projects/Hospital Full stack/hospital nfc app`.
3. **Configure Native Plugins**: Set up `react-native-nfc-manager` for Android tablet builds.
