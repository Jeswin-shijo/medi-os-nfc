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
} as const;
