import assert from 'node:assert/strict';
import { test } from 'node:test';
import { layoutFor } from './layout';
import { contentWidth, entryRowWidth, fit, keyHeight, otpMetrics, padWidth, patientFactsTwoColumns, phoneMetrics, sideBySide, welcomeStacked, welcomeTilesDense } from './sizing';

test('fit keeps the tablet size where there is room and shrinks where there is not', () => {
  assert.equal(fit(460, 1200), 460);
  assert.equal(fit(460, 358), 358);
  assert.equal(fit(460, -5), 0);
});

test('the 1280 × 800 tablet keeps its sizes', () => {
  const l = layoutFor(1280, 800);
  assert.equal(contentWidth(l), 1200);
  assert.equal(sideBySide(l), true);
  assert.equal(padWidth(l), 460);
  assert.equal(keyHeight(l), 80);
});

test('a phone upright stacks the pad full width up to 420', () => {
  const l = layoutFor(390, 844);
  assert.equal(sideBySide(l), false);
  assert.equal(padWidth(l), 358);
  assert.equal(padWidth(layoutFor(540, 900)), 420);
  assert.equal(keyHeight(l), 60);
});

test('a phone on its side sits side by side with a narrower pad and short keys', () => {
  const l = layoutFor(844, 390);
  assert.equal(sideBySide(l), true);
  assert.ok(padWidth(l) <= 380);
  assert.equal(keyHeight(l), 56);
  assert.equal(l.touchMin, 56);
});

test('a portrait tablet stacks', () => {
  const l = layoutFor(800, 1280);
  assert.equal(sideBySide(l), false);
  assert.equal(padWidth(l), 420);
});

test('phone field cells match the tablet at the tablet width and shrink to fit a phone', () => {
  const wide = phoneMetrics(652);
  assert.deepEqual([wide.prefixWidth, wide.cellWidth, wide.groupGap, wide.digitFont, wide.fieldHeight], [96, 38, 20, 40, 96]);
  const narrow = phoneMetrics(326);
  const total = narrow.prefixWidth + narrow.gap + 2 * narrow.fieldPadding + 4 + 10 * narrow.cellWidth + narrow.groupGap;
  assert.ok(total <= 326, `needs ${total}`);
  assert.ok(narrow.cellWidth >= 16 && narrow.digitFont >= 22);
});

test('code boxes are 72 wide on a tablet and shrink to fit a phone', () => {
  assert.deepEqual(otpMetrics(600), { gap: 14, boxWidth: 72, boxHeight: 88, digitFont: 40 });
  const m = otpMetrics(326);
  assert.ok(6 * m.boxWidth + 5 * m.gap <= 326);
  assert.ok(m.boxWidth >= 40);
});

test('the first-frame row width matches the tablet and fits a phone', () => {
  assert.ok(Math.abs(entryRowWidth(layoutFor(1280, 800)) - 652) <= 2);
  assert.equal(entryRowWidth(layoutFor(390, 844)), 326);
});

test('keys and phone touch targets are never under the layout minimum', () => {
  for (const [w, h] of [[390, 844], [844, 390], [800, 1280], [1280, 800]] as const) {
    const l = layoutFor(w, h);
    assert.ok(keyHeight(l) >= l.touchMin, `${w}x${h}`);
  }
});

test('Welcome row tiles go dense where their column is narrow, so the title and line fit', () => {
  assert.equal(welcomeTilesDense(layoutFor(1280, 800)), false);
  assert.equal(welcomeTilesDense(layoutFor(1920, 1200)), false);
  // Tablet upright, phone on its side, small tablet on its side: the column is under 440 dp.
  assert.equal(welcomeTilesDense(layoutFor(800, 1280)), true);
  assert.equal(welcomeTilesDense(layoutFor(952, 427)), true);
  assert.equal(welcomeTilesDense(layoutFor(1024, 640)), true);
  // A phone upright stacks the tiles full width (it already uses the compact tile).
  assert.equal(welcomeTilesDense(layoutFor(427, 952)), false);
});

test('patient facts sit two to a row only where "48 years · Female" and "26 Sep 2026 11:30 AM" fit', () => {
  assert.equal(patientFactsTwoColumns(layoutFor(1280, 800)), true);
  assert.equal(patientFactsTwoColumns(layoutFor(1920, 1200)), true);
  // Tablet upright, small tablet on its side and a phone on its side cut them short in two columns.
  assert.equal(patientFactsTwoColumns(layoutFor(800, 1280)), false);
  assert.equal(patientFactsTwoColumns(layoutFor(1024, 640)), false);
  assert.equal(patientFactsTwoColumns(layoutFor(952, 427)), false);
  // A phone upright stacks the card; its facts are one per row already.
  assert.equal(patientFactsTwoColumns(layoutFor(427, 952)), false);
});

test('Welcome stacks its tiles on phones upright and small tablets upright', () => {
  assert.equal(welcomeStacked(layoutFor(427, 952)), true);
  assert.equal(welcomeStacked(layoutFor(640, 1024)), true);
  assert.equal(welcomeStacked(layoutFor(800, 1280)), false);
  assert.equal(welcomeStacked(layoutFor(952, 427)), false);
  assert.equal(welcomeStacked(layoutFor(1280, 800)), false);
  // Stacked tiles are full width: never dense.
  assert.equal(welcomeTilesDense(layoutFor(640, 1024)), false);
});
