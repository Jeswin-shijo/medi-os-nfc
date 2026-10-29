import assert from 'node:assert/strict';
import { test } from 'node:test';
import { revealOffset } from './keyboardReveal';

// A phone upright: the scroll view starts under the header at 160 dp and is 790 dp tall; the keyboard's top is at 615.
const view = { top: 160, height: 790, offset: 0 };

test('a field under the keyboard scrolls up until it sits just above it', () => {
  // Age field at 700–760 in the window: its bottom plus 16 dp must reach 615.
  assert.equal(revealOffset({ top: 700, height: 60 }, view, 615), 700 + 60 + 16 - 615);
});

test('the scroll adds to where the view already is', () => {
  assert.equal(revealOffset({ top: 700, height: 60 }, { ...view, offset: 40 }, 615), 40 + 161);
});

test('a field already in sight stays put', () => {
  assert.equal(revealOffset({ top: 300, height: 60 }, view, 615), null);
});

test('a field scrolled up under the top edge comes back down into sight', () => {
  assert.equal(revealOffset({ top: 120, height: 60 }, { ...view, offset: 200 }, 615), 200 - (160 + 16 - 120));
  assert.equal(revealOffset({ top: 150, height: 60 }, { ...view, offset: 5 }, 615), 0);
});

test('a short scroll view (the keyboard below it) uses its own bottom edge', () => {
  assert.equal(revealOffset({ top: 500, height: 60 }, { top: 160, height: 300, offset: 0 }, 900), 500 + 60 + 16 - 460);
});
