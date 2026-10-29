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
    placeholder: 'Reception kiosk is connected',
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
