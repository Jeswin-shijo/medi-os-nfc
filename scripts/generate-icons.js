#!/usr/bin/env node

/**
 * Renders every icon of the MediOS Reception kiosk from the vector mark in brandLogo.ts,
 * using headless Google Chrome as the rasteriser (same approach as the MediOS app).
 *
 *   node scripts/generate-icons.js [assets-dir] [--logo path/to/brandLogo.ts]
 *
 * assets-dir defaults to ../assets next to this script. brandLogo.ts is looked up at
 * ../src/theme/brandLogo.ts, then next to this script, unless --logo is given.
 *
 * After running, rebuild the native app so the launcher icon and splash update:
 *   npx expo prebuild -p android --clean && npx expo run:android
 */

const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const args = process.argv.slice(2);
const logoFlag = args.indexOf('--logo');
const logoArg = logoFlag >= 0 ? args.splice(logoFlag, 2)[1] : null;
const OUT = path.resolve(args[0] || path.join(__dirname, '../assets'));
const LOGO = logoArg
  ? path.resolve(logoArg)
  : [path.resolve(__dirname, '../src/theme/brandLogo.ts'), path.join(__dirname, 'brandLogo.ts')].find((p) => fs.existsSync(p));

const CHROME =
  process.env.CHROME_PATH ||
  ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].find((p) =>
    fs.existsSync(p)
  );

if (!CHROME) {
  console.error('Google Chrome not found: set CHROME_PATH to a Chrome/Chromium binary.');
  process.exit(1);
}
if (!LOGO) {
  console.error('brandLogo.ts not found: pass --logo path/to/brandLogo.ts');
  process.exit(1);
}

process.removeAllListeners('warning');
const { buildLogoSvg, BRAND } = require(LOGO);

fs.mkdirSync(OUT, { recursive: true });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'reception-icons-'));

const render = (file, size, options) => {
  const svgPath = path.join(tmp, `${file}.svg`);
  fs.writeFileSync(svgPath, buildLogoSvg({ size, ...options }));
  const out = path.join(OUT, file);
  execFileSync(
    CHROME,
    [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      '--force-device-scale-factor=1',
      '--default-background-color=00000000',
      `--window-size=${size},${size}`,
      `--screenshot=${out}`,
      `file://${svgPath}`,
    ],
    { stdio: 'ignore' }
  );
  console.log(`✔ ${path.relative(process.cwd(), out)} (${size}×${size})`);
};

/** Rounded tile with transparent corners (~22% corners), as for the in-app logo and favicon. */
const TILE = 225;
/**
 * Android adaptive layers (108 dp canvas, launchers show the centre 72 dp and never crop the
 * centre 66 dp circle): this padding keeps the whole mark inside that circle and gives it the
 * same share of the visible icon as on the square tile.
 */
const ADAPTIVE = 0.26;
/** Android 12+ splash masks the icon to a circle 2/3 of its width: keep the mark well inside. */
const SPLASH = 0.24;

// iOS / default app icon: full-bleed square tile (the OS applies its own mask).
render('icon.png', 1024, { cornerRadius: 0 });
// Android adaptive icon layers.
render('android-icon-background.png', 1024, { mark: false });
render('android-icon-foreground.png', 1024, { background: 'none', padding: ADAPTIVE, shadow: true });
render('android-icon-monochrome.png', 1024, { background: 'none', padding: ADAPTIVE, monochrome: true });
// Splash: white mark on transparent, for a MediOS-blue splash background.
render('splash-icon.png', 1024, { background: 'none', padding: SPLASH, monochrome: true });
// Same mark in blue, if the splash background is white instead.
render('splash-icon-on-light.png', 1024, { background: 'none', padding: SPLASH, monochrome: true, foreground: BRAND.ink });
// Expo web favicon (tabs show 16–32 px: heavy waves, no shadow) and the README/docs logo.
render('favicon.png', 48, { cornerRadius: TILE, shadow: false, heavy: true, padding: 0.14 });
render('logo.png', 512, { cornerRadius: TILE });

fs.rmSync(tmp, { recursive: true, force: true });
