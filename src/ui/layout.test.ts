import assert from 'node:assert/strict';
import { test } from 'node:test';
import { layoutFor } from './layout';

test('phone upright is compact with one doctor per row', () => {
  const l = layoutFor(390, 844);
  assert.equal(l.size, 'compact');
  assert.equal(l.short, false);
  assert.equal(l.columns('doctor'), 1);
  assert.equal(l.columns('department'), 2);
  assert.equal(l.columns('tiles'), 1);
  assert.equal(l.touchMin, 56);
  assert.equal(l.type.title, 26);
  assert.equal(l.type.body, 18);
});

test('phone on its side is medium and short', () => {
  const l = layoutFor(844, 390);
  assert.equal(l.size, 'medium');
  assert.equal(l.short, true);
  assert.equal(l.touchMin, 56);
});

test('tablet upright is medium', () => {
  const l = layoutFor(800, 1280);
  assert.equal(l.size, 'medium');
  assert.equal(l.short, false);
  assert.equal(l.columns('department'), 3);
  assert.equal(l.columns('doctor'), 2);
  assert.equal(l.columns('tiles'), 2);
});

test('tablet sideways at 1280 keeps today\'s layout', () => {
  const l = layoutFor(1280, 800);
  assert.equal(l.size, 'expanded');
  assert.equal(l.columns('department'), 3);
  assert.equal(l.columns('doctor'), 2);
  assert.equal(l.columns('tiles'), 3);
  assert.equal(l.gutter, 40);
  assert.equal(l.contentMax, 1480);
  assert.deepEqual(l.type, { title: 34, subtitle: 22, body: 20, label: 18 });
});

test('large tablet gets 4 department and 3 doctor columns', () => {
  const l = layoutFor(1920, 1200);
  assert.equal(l.size, 'expanded');
  assert.equal(l.columns('department'), 4);
  assert.equal(l.columns('doctor'), 3);
  assert.equal(l.columns('tiles'), 3);
});

test('the wide threshold is 1600 dp, as the screens use today', () => {
  assert.equal(layoutFor(1599, 900).columns('department'), 3);
  assert.equal(layoutFor(1600, 900).columns('department'), 4);
  assert.equal(layoutFor(1599, 900).columns('doctor'), 2);
  assert.equal(layoutFor(1600, 900).columns('doctor'), 3);
});

test('size class boundaries: 599 / 600 and 999 / 1000', () => {
  assert.equal(layoutFor(599, 900).size, 'compact');
  assert.equal(layoutFor(600, 900).size, 'medium');
  assert.equal(layoutFor(999, 700).size, 'medium');
  assert.equal(layoutFor(1000, 700).size, 'expanded');
});

test('short is a height under 600', () => {
  assert.equal(layoutFor(1000, 599).short, true);
  assert.equal(layoutFor(1000, 600).short, false);
});

test('content max follows the window below expanded', () => {
  assert.equal(layoutFor(800, 1280).contentMax, 800);
});

test('band and tracker heights shrink on phones and short windows', () => {
  assert.deepEqual([layoutFor(1280, 800).headerHeight, layoutFor(1280, 800).stepperHeight], [96, 60]);
  assert.deepEqual([layoutFor(800, 1280).headerHeight, layoutFor(800, 1280).stepperHeight], [80, 56]);
  assert.deepEqual([layoutFor(390, 844).headerHeight, layoutFor(390, 844).stepperHeight], [64, 48]);
  assert.deepEqual([layoutFor(844, 390).headerHeight, layoutFor(844, 390).stepperHeight], [64, 48]);
});
