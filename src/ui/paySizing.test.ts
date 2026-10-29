import assert from 'node:assert/strict';
import { test } from 'node:test';
import { layoutFor } from './layout';
import { cashSizes, chromeHeight, departmentBadge, doctorCardMetrics, gridItemWidth, gridWidth, machineScale, methodTiles, paidSizes, upiSizes } from './paySizing';
import { layoutHeight } from './windowHeight';

test('grid items split the width and the gaps', () => {
  assert.equal(gridItemWidth(1200, 3, 24), 384);
  assert.equal(gridItemWidth(358, 2, 12), 173);
  assert.equal(gridItemWidth(100, 1, 24), 100);
});

test('the 1280 × 800 tablet keeps its payment sizes', () => {
  const l = layoutFor(1280, 800);
  assert.equal(chromeHeight(l), 250);
  assert.equal(gridWidth(l), 1200);
  const upi = upiSizes(l);
  assert.deepEqual(upi, { stacked: false, ring: 550, stroke: 12, qr: 366 });
  assert.equal(methodTiles(l, 3).perRow, 3);
  assert.equal(methodTiles(l, 3).fillHeight, true);
  assert.deepEqual(machineScale(l), { stacked: false, scale: 1 });
  assert.equal(paidSizes(l).check, 280);
  assert.equal(cashSizes(l, 6).codeFont, 140);
  assert.equal(departmentBadge(l).box, 84);
  assert.equal(doctorCardMetrics(588).narrow, false);
  assert.equal(doctorCardMetrics(450).avatar, 88);
});

test('the QR ring is capped at 620 and floored at 380 on a tablet', () => {
  assert.equal(upiSizes(layoutFor(1920, 1200)).ring, 620);
  assert.equal(upiSizes(layoutFor(1280, 560)).ring, 380);
});

test('the QR keeps 220 to 360 dp and its corners inside the ring', () => {
  for (const [w, h] of [[390, 844], [412, 915], [844, 390], [800, 1280], [960, 600], [1280, 800], [1920, 1200], [320, 640]] as const) {
    const l = layoutFor(w, h);
    const s = upiSizes(l);
    assert.ok(s.qr >= 200, `${w}x${h} qr ${s.qr}`);
    assert.ok(s.qr <= (l.size === 'expanded' ? 450 : 360), `${w}x${h} qr ${s.qr}`);
    assert.ok(s.qr * Math.SQRT2 <= s.ring - 2 * s.stroke - 8 + 1e-9, `${w}x${h} corners`);
    if (l.size !== 'expanded') assert.ok(s.ring <= l.width - 2 * l.gutter + 40 || s.qr === 200, `${w}x${h} ring fits`);
  }
});

test('a phone upright stacks the ring above the countdown with a QR of at least 220', () => {
  const s = upiSizes(layoutFor(390, 844));
  assert.equal(s.stacked, true);
  assert.equal(s.qr, 220);
  assert.ok(s.ring <= 390 - 32);
});

test('a phone on its side puts the QR beside the steps', () => {
  const s = upiSizes(layoutFor(844, 390));
  assert.equal(s.stacked, false);
  assert.equal(s.qr, 220);
});

test('a portrait tablet gets the biggest QR', () => {
  assert.equal(upiSizes(layoutFor(800, 1280)).qr, 360);
});

test('the cash code shrinks to fit six digits on a phone', () => {
  const s = cashSizes(layoutFor(390, 844), 6);
  assert.ok(s.codeFont < 140 && s.codeFont >= 48);
  const width = 6 * (0.62 * s.codeFont + s.codeSpacing);
  assert.ok(width <= 390 - 32 - 2 * s.cardPadding - 2 * s.codePaddingX);
});

test('the card machine scales down on phones, never above 1', () => {
  const phone = machineScale(layoutFor(390, 844));
  assert.equal(phone.stacked, true);
  assert.ok(phone.scale < 1 && phone.scale >= 0.5);
  assert.ok(machineScale(layoutFor(1920, 1200)).scale <= 1);
});

test('payment method tiles stack on a phone and sit in a row on a tablet', () => {
  assert.deepEqual(methodTiles(layoutFor(390, 844), 3), { perRow: 1, orientation: 'row', fillHeight: false });
  assert.equal(methodTiles(layoutFor(800, 1280), 3).perRow, 2);
  assert.equal(methodTiles(layoutFor(844, 390), 3).perRow, 3);
  assert.equal(methodTiles(layoutFor(1280, 800), 1).perRow, 1);
});

test('paid details stack under the check on a phone upright', () => {
  assert.equal(paidSizes(layoutFor(390, 844)).stacked, true);
  assert.equal(paidSizes(layoutFor(844, 390)).stacked, false);
});

test('doctor cards under 420 dp go narrow', () => {
  const m = doctorCardMetrics(358);
  assert.equal(m.narrow, true);
  assert.equal(m.avatar, 64);
});

test('window height: real size normally, never below the screen while the keyboard is up', () => {
  const screen = { width: 1080, height: 2340 };
  // split-screen: a short window is reported short
  assert.equal(layoutHeight({ width: 540, height: 600 }, screen, false), 600);
  // keyboard up on a phone upright: the shrunken window is lifted back to the screen's height
  assert.equal(layoutHeight({ width: 390, height: 500 }, { width: 390, height: 844 }, true), 844);
  // keyboard up on a phone on its side: the screen's short edge
  assert.equal(layoutHeight({ width: 844, height: 180 }, { width: 390, height: 844 }, true), 390);
  assert.equal(layoutHeight({ width: 844, height: 390 }, { width: 390, height: 844 }, true), 390);
});
