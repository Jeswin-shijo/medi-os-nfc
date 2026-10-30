// The kiosk keeps a hidden text field focused for the USB card reader. On a large screen Android shows the
// on-screen keyboard by itself for a focused text field when the window comes back into focus (after Home,
// a system dialog such as the USB printer permission, or the setup link), so the keyboard covered Welcome.
// `stateAlwaysHidden` stops that; a tap on a real field (Register, staff sign-in) still shows the keyboard.
const { AndroidConfig, withAndroidManifest } = require('expo/config-plugins');

module.exports = function withKeyboardHiddenOnFocus(config) {
  return withAndroidManifest(config, (cfg) => {
    const activity = AndroidConfig.Manifest.getMainActivityOrThrow(cfg.modResults);
    activity.$['android:windowSoftInputMode'] = 'adjustResize|stateAlwaysHidden';
    return cfg;
  });
};
