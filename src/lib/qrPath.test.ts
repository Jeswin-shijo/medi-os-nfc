import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { qrMatrix, qrPath } from './qrPath';

/** A square bit matrix from rows of '#' (dark) and '.' (light). */
const matrix = (...rows: string[]) => ({
  size: rows.length,
  get: (row: number, col: number) => rows[row]![col] === '#',
});

/** Every dark cell the path paints, read back from its `M x y h w v1 h-w z` runs. */
function painted(path: string): Set<string> {
  const cells = new Set<string>();
  for (const [, x, y, w] of path.matchAll(/M(\d+) (\d+)h(\d+)v1h-\3z/g)) {
    for (let i = 0; i < Number(w); i++) cells.add(`${Number(x) + i},${y}`);
  }
  return cells;
}

describe('qrPath', () => {
  it('draws each horizontal run of dark modules as one rectangle, offset by the margin', () => {
    const path = qrPath(matrix('##.', '.#.', '###'), 1);
    assert.equal(path, 'M1 1h2v1h-2zM2 2h1v1h-1zM1 3h3v1h-3z');
  });

  it('draws nothing for an all-light matrix', () => {
    assert.equal(qrPath(matrix('..', '..'), 0), '');
  });

  it('paints exactly the dark modules of a real UPI code', () => {
    const qr = qrMatrix('upi://pay?pa=medios.sample@sample&pn=MediOS%20SAMPLE&am=300&cu=INR&tn=OP%20visit');
    const expected = new Set<string>();
    for (let row = 0; row < qr.size; row++) {
      for (let col = 0; col < qr.size; col++) if (qr.get(row, col)) expected.add(`${col},${row}`);
    }
    assert.ok(expected.size > 100);
    assert.deepEqual(painted(qrPath(qr, 0)), expected);
  });
});
