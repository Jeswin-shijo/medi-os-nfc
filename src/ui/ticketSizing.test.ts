import assert from 'node:assert/strict';
import { test } from 'node:test';
import { layoutFor } from './layout';
import { SIDE_WIDTH, ticketSizes, ticketStacked } from './ticketSizing';

test('the 1280 × 800 tablet keeps its ticket sizes', () => {
  const s = ticketSizes(layoutFor(1280, 800));
  assert.equal(s.stacked, false);
  assert.equal(s.sideWidth, SIDE_WIDTH);
  assert.equal(s.gap, 40);
  assert.equal(s.paperPadX, 28);
  assert.deepEqual(s.token, { fontSize: 96, lineHeight: 108 });
  assert.equal(s.title.fontSize, 34);
  assert.equal(s.qr, 176);
  assert.equal(s.qrColumn, false);
  assert.equal(s.factFont, 22);
  assert.equal(s.showSubtitle, true);
  assert.equal(s.factsTwoColumns, true);
});

test('token size follows the window height on the expanded layout, as before', () => {
  assert.equal(ticketSizes(layoutFor(1280, 720)).token.fontSize, 80);
  assert.equal(ticketSizes(layoutFor(1920, 1200)).token.fontSize, 128);
  assert.equal(ticketSizes(layoutFor(1280, 720)).showSubtitle, false);
});

test('phones upright stack the side column under the slip', () => {
  for (const w of [360, 390, 412]) {
    const s = ticketSizes(layoutFor(w, 800));
    assert.equal(s.stacked, true);
    assert.equal(s.sideWidth, w - 32);
    assert.equal(s.qrColumn, true);
    assert.equal(s.token.fontSize, 72);
    assert.equal(s.qr, 160);
  }
});

test('a small tablet upright stacks, and sideways sits beside', () => {
  assert.equal(ticketStacked(layoutFor(800, 1280)), true);
  assert.equal(ticketStacked(layoutFor(768, 1024)), true);
  assert.equal(ticketStacked(layoutFor(1280, 800)), false);
  const portrait = ticketSizes(layoutFor(800, 1280));
  assert.equal(portrait.qrColumn, false);
  assert.equal(portrait.token.fontSize, 88);
});

test('a phone on its side sits beside, with a narrower column and a lighter header', () => {
  const s = ticketSizes(layoutFor(844, 390));
  assert.equal(s.stacked, false);
  assert.ok(s.sideWidth >= 300 && s.sideWidth <= 480);
  assert.equal(s.qrColumn, true);
  assert.equal(s.showSubtitle, false);
  assert.equal(s.token.fontSize, 72);
});

test('the slip and side column never exceed the content width', () => {
  for (const [w, h] of [[360, 640], [412, 915], [600, 960], [844, 390], [999, 600], [1000, 700], [1280, 800], [1920, 1200]] as const) {
    const l = layoutFor(w, h);
    const s = ticketSizes(l);
    if (!s.stacked) assert.ok(s.sideWidth + s.gap < Math.min(w, l.contentMax) - 2 * l.gutter, `${w}x${h}`);
  }
});

test('the facts go to one column when the slip is narrow (phones upright)', () => {
  assert.equal(ticketSizes(layoutFor(320, 640)).factsTwoColumns, false);
  assert.equal(ticketSizes(layoutFor(390, 800)).factsTwoColumns, false);
  assert.equal(ticketSizes(layoutFor(768, 1024)).factsTwoColumns, true);
});

test('the OP number and the time share a row only where both fit; narrow slips put the time under the number', () => {
  assert.equal(ticketSizes(layoutFor(1280, 800)).topRow, true);
  assert.equal(ticketSizes(layoutFor(800, 1280)).topRow, true);
  assert.equal(ticketSizes(layoutFor(1920, 1200)).topRow, true);
  // Phones either way and the small tablet on its side would cut the OP number short on one row.
  assert.equal(ticketSizes(layoutFor(427, 952)).topRow, false);
  assert.equal(ticketSizes(layoutFor(952, 427)).topRow, false);
  assert.equal(ticketSizes(layoutFor(1024, 640)).topRow, false);
});
