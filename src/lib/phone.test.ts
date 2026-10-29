import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { formatIndianMobile, isValidIndianMobile } from './phone';

describe('formatIndianMobile', () => {
  it('groups ten digits as 5 + 5', () => {
    assert.equal(formatIndianMobile('9876543210'), '98765 43210');
  });
  it('formats a partly typed number without a trailing space', () => {
    assert.equal(formatIndianMobile(''), '');
    assert.equal(formatIndianMobile('98765'), '98765');
    assert.equal(formatIndianMobile('987654'), '98765 4');
  });
  it('ignores non-digits and digits past the tenth', () => {
    assert.equal(formatIndianMobile('98765-43210 99'), '98765 43210');
  });
});

describe('isValidIndianMobile', () => {
  it('accepts ten digits starting 6 to 9', () => {
    for (const first of '6789') assert.equal(isValidIndianMobile(`${first}123456789`), true);
  });
  it('rejects a wrong length or first digit', () => {
    assert.equal(isValidIndianMobile('5123456789'), false);
    assert.equal(isValidIndianMobile('012345678'), false);
    assert.equal(isValidIndianMobile('98765432101'), false);
    assert.equal(isValidIndianMobile('987654321'), false);
    assert.equal(isValidIndianMobile('98765 4321'), false);
    assert.equal(isValidIndianMobile(''), false);
  });
});
