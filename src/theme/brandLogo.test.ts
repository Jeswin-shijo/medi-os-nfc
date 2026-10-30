import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MARK_FULL, MARK_HEAVY, buildLogoSvg, markForWidth } from './brandLogo';

const optionSets = [
  {},
  { background: 'none' as const },
  { background: '#FFFFFF', foreground: '#1E6BFF', shadow: false },
  { monochrome: true, heavy: true, padding: 0.26 },
  { mark: false, size: 512, cornerRadius: 120 },
];

test('buildLogoSvg returns a well-formed svg for every option set', () => {
  for (const options of optionSets) {
    const svg = buildLogoSvg(options);
    assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" /);
    assert.match(svg, /<\/svg>$/);
    assert.equal(svg.match(/<svg /g)?.length, 1);
    assert.ok(!svg.includes('NaN') && !svg.includes('undefined'), 'no NaN or undefined in the drawing');
  }
});

test('the mark draws the cross and its waves, or nothing when mark is false', () => {
  assert.equal(buildLogoSvg({ background: 'none' }).match(/<path /g)?.length, 1 + MARK_FULL.waves.length);
  assert.equal(buildLogoSvg({ heavy: true, background: 'none' }).match(/<path /g)?.length, 1 + MARK_HEAVY.waves.length);
  assert.ok(!buildLogoSvg({ mark: false }).includes('<path'));
});

test('markForWidth switches to the heavy mark under 32 and not from 32', () => {
  assert.equal(markForWidth(24), MARK_HEAVY);
  assert.equal(markForWidth(31), MARK_HEAVY);
  assert.equal(markForWidth(32), MARK_FULL);
  assert.equal(markForWidth(38), MARK_FULL);
});
