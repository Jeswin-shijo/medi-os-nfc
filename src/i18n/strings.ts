// All kiosk copy, English only.

export const strings = {
  setup: {
    title: 'Set up this kiosk',
    intro: 'Enter the server address and the kiosk key an administrator gave you, or open the kiosk link on this tablet.',
    serverLabel: 'Server address',
    serverPlaceholder: 'http://192.168.1.20:4000/api',
    keyLabel: 'Kiosk key',
    keyPlaceholder: 'mqk_...',
    connect: 'Connect',
    connecting: 'Connecting...',
    needBoth: 'Enter the server address and the kiosk key.',
    badAddress: 'That server address does not look right. It starts with http:// or https://.',
    badKey: 'That kiosk key is not valid. Ask an administrator for a new one.',
    badLink: 'This kiosk link is not valid. Ask an administrator for a new one.',
  },
  errors: {
    network: 'The kiosk cannot reach the hospital server.',
    revoked: 'This kiosk was removed. Ask an administrator.',
    generic: 'Something went wrong. Please try again.',
  },
  offline: {
    title: 'Cannot reach the hospital server',
    retry: 'Try again',
    changeSetup: 'Change kiosk settings',
  },
  welcome: {
    title: (hospital: string) => (hospital ? `Welcome to ${hospital}` : 'Welcome'),
    subtitle: 'How would you like to check in?',
    card: {
      title: 'Tap your card',
      subtitle: 'Existing patient (fastest)',
      badge: 'Fastest',
      /** After a press on the tile: the card goes on the reader, not on the screen. */
      hint: 'Hold your card flat on the card reader',
      reading: 'Reading your card…',
      found: 'Found you!',
      /** Unknown card on a kiosk without Find my record (the server's message mentions it). */
      unknownAskCounter: "This card isn't linked yet. Please ask at the reception counter.",
    },
    find: { title: 'Find my record', subtitle: 'Forgot your card? Use your mobile number' },
    /** Shown instead of Find my record when the kiosk cannot send codes by SMS. */
    findOff: { title: 'Forgot your card?', body: 'Please ask at the reception counter. We will find your record for you.' },
    newPatient: { title: 'New patient', subtitle: 'First visit' },
    help: 'Need help? Please ask at the reception counter.',
  },
  card: {
    /** iOS shows this in its reading sheet; Android reads without asking. */
    nfcPrompt: 'Hold your card near the tablet',
  },
  patient: {
    title: 'Is this you?',
    subtitle: 'Please check your details, then continue.',
    identified: 'Patient identified',
    uhid: (uhid: string) => `Patient ID ${uhid}`,
    ageSex: 'Age / Sex',
    ageSexValue: (age: number, gender: string) => `${age} ${age === 1 ? 'year' : 'years'} · ${gender}`,
    mobile: 'Mobile number',
    lastVisit: 'Last visit',
    department: 'Department',
    appointment: (time: string) => `You have an appointment today at ${time}`,
    continue: 'Continue',
    notMe: 'Not me',
  },
  hasToken: {
    title: 'You already have a token today',
    subtitle: (name?: string) => (name ? `${name}, there is no need to pay again.` : 'There is no need to pay again.'),
    yourToken: 'Your token',
    ahead: (n: number) => (n <= 0 ? "You're next" : n === 1 ? '1 person ahead of you' : `${n} people ahead of you`),
    called: 'Your number has been called. Please go in now.',
    skipped: 'You missed your turn. Please ask at the reception counter.',
    doctor: 'Doctor',
    department: 'Department',
    room: 'Room',
    print: 'Print slip',
    printAgain: 'Print again',
    printed: 'Slip printed. Please take it from the printer.',
    printFailed: 'Please collect your slip at the reception counter.',
    done: 'Done',
  },
  shell: {
    fallbackName: 'MediOS Reception',
    subtitle: 'OP Registration Kiosk',
    startOver: 'Start over',
    logoHint: 'Hospital logo',
  },
  steps: ['Identify', 'Doctor', 'Pay', 'Ticket'],
  stepOf: (current: number, total: number) => `Step ${current} of ${total}`,
  stepDone: (name: string) => `${name}, done`,
  stepCurrent: (name: string) => `${name}, current step`,
  idle: {
    title: 'Are you still there?',
    body: 'For your privacy, this screen will start over soon.',
    stay: "I'm still here",
    startOver: 'Start over',
    secondsLeft: (n: number) => `${n} seconds left`,
  },
  status: {
    loading: 'Loading…',
    errorTitle: 'Something went wrong',
    retry: 'Try again',
  },
  sample: {
    badge: 'SAMPLE',
  },
  numberPad: {
    clear: 'Clear',
    backspace: 'Delete last digit',
  },
  otp: {
    label: (filled: number, total: number) => `Code, ${filled} of ${total} digits entered`,
  },
  qr: {
    label: 'QR code',
  },
} as const;
