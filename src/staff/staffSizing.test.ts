import assert from 'node:assert/strict';
import { test } from 'node:test';
import { layoutFor } from '../ui/layout';
import { staffSizes } from './staffSizing';

test('the 1280 × 800 tablet keeps its staff sizes', () => {
  const s = staffSizes(layoutFor(1280, 800));
  assert.equal(s.stackBar, false);
  assert.equal(s.whoMax, 320);
  assert.equal(s.bodyPadY, 40);
  assert.equal(s.innerMax, 1040);
  assert.equal(s.narrowMax, 560);
  assert.equal(s.cardPadding, 24);
  assert.equal(s.inputFont, 20);
  assert.equal(s.tileBasis, 440);
});

test('every control is at least the touch minimum', () => {
  for (const [w, h] of [[360, 640], [390, 844], [844, 390], [768, 1024], [1280, 800], [1920, 1200]] as const) {
    const l = layoutFor(w, h);
    assert.ok(staffSizes(l).controlHeight >= l.touchMin, `${w}x${h}`);
  }
  assert.equal(staffSizes(layoutFor(390, 844)).controlHeight, 56);
  assert.equal(staffSizes(layoutFor(1280, 800)).controlHeight, 64);
});

test('a phone upright stacks the bar and gives each menu tile a whole row', () => {
  const l = layoutFor(390, 844);
  const s = staffSizes(l);
  assert.equal(s.stackBar, true);
  assert.equal(s.tileBasis, 358);
  assert.equal(s.cardPadding, 16);
});

test('the "signed in as" text never takes more than 30% of a medium window', () => {
  assert.equal(staffSizes(layoutFor(600, 900)).whoMax, 180);
  assert.equal(staffSizes(layoutFor(844, 390)).whoMax, 253);
});

test('a phone on its side keeps the body padding small', () => {
  assert.equal(staffSizes(layoutFor(844, 390)).bodyPadY, 16);
});
