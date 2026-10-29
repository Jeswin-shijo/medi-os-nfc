import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { makeStaleCheck } from './stale';

describe('makeStaleCheck', () => {
  it('is fresh while the screen stays and the generation is unchanged', () => {
    const stale = makeStaleCheck(() => 3, () => true);
    assert.equal(stale(), false);
  });
  it('is stale once the screen has unmounted', () => {
    let mounted = true;
    const stale = makeStaleCheck(() => 3, () => mounted);
    mounted = false;
    assert.equal(stale(), true);
  });
  it('is stale once the kiosk has started over (generation moved)', () => {
    let generation = 3;
    const stale = makeStaleCheck(() => generation, () => true);
    generation = 4;
    assert.equal(stale(), true);
  });
  it('compares with the generation at the start, not a later one', () => {
    let generation = 3;
    const early = makeStaleCheck(() => generation, () => true);
    generation = 4;
    const late = makeStaleCheck(() => generation, () => true);
    assert.equal(early(), true);
    assert.equal(late(), false);
  });
});
