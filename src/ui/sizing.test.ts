import assert from 'node:assert/strict';
import { test } from 'node:test';
import { layoutFor } from './layout';
import { contentWidth, entryRowWidth, fit, keyHeight, otpMetrics, padWidth, phoneMetrics, sideBySide } from './sizing';

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
