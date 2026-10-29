import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';
import { IdleClock, idleLimitSeconds, WARNING_SECONDS } from './inactivity';

const cfg = { idleSeconds: 60 };

describe('idleLimitSeconds', () => {
  it('never times out on the welcome screen', () => {
    assert.equal(idleLimitSeconds('/', cfg), null);
  });

  it('never times out on the setup screen', () => {
    assert.equal(idleLimitSeconds('/setup', cfg), null);
  });

  it('never times out in the staff menu (it has its own sign-out)', () => {
    assert.equal(idleLimitSeconds('/staff', cfg), null);
    assert.equal(idleLimitSeconds('/staff/link-card', cfg), null);
    assert.equal(idleLimitSeconds('/staff/printer', cfg), null);
  });

  it('never times out in the developer gallery', () => {
    assert.equal(idleLimitSeconds('/_dev/ui', cfg), null);
  });

  it('gives 5 minutes on the UPI and card waiting screens', () => {
    assert.equal(idleLimitSeconds('/pay/upi', cfg), 300);
    assert.equal(idleLimitSeconds('/pay/card', cfg), 300);
  });

  it('gives 3 minutes on the cash screen', () => {
    assert.equal(idleLimitSeconds('/pay/cash', cfg), 180);
  });

  it('never asks on the ticket screen: its own 30 s ring goes back to Welcome, exactly once', () => {
    assert.equal(idleLimitSeconds('/ticket', cfg), null);
    assert.equal(idleLimitSeconds('/ticket/', cfg), null);
  });

  it("uses the kiosk's own limit on every other step", () => {
    for (const route of ['/patient', '/has-token', '/find', '/find/otp', '/find/choose', '/register', '/department', '/doctor', '/payment', '/paid']) {
      assert.equal(idleLimitSeconds(route, { idleSeconds: 75 }), 75, route);
    }
  });

  it('does not mistake look-alike routes for the special ones', () => {
    assert.equal(idleLimitSeconds('/staffing', cfg), 60);
    assert.equal(idleLimitSeconds('/pay/upi-help', cfg), 60);
    assert.equal(idleLimitSeconds('/tickets', cfg), 60);
  });

  it('ignores a trailing slash', () => {
    assert.equal(idleLimitSeconds('/pay/upi/', cfg), 300);
    assert.equal(idleLimitSeconds('/staff/', cfg), null);
  });
});

describe('WARNING_SECONDS', () => {
  it('gives the patient 10 seconds to answer "Are you still there?"', () => {
    assert.equal(WARNING_SECONDS, 10);
  });
});

describe('IdleClock', () => {
  const at = (clock: IdleClock) => clock.askedFor();

  function withTimers(run: () => void) {
    mock.timers.enable({ apis: ['setTimeout'] });
    try {
      run();
    } finally {
      mock.timers.reset();
    }
  }

  it('asks "Are you still there?" when the screen has been idle for its limit', () => {
    withTimers(() => {
      const clock = new IdleClock();
      clock.enter('/department', 60);
      mock.timers.tick(59_999);
      assert.equal(at(clock), null);
      mock.timers.tick(1);
      assert.equal(at(clock), '/department');
    });
  });

  it('a touch takes the question away and starts the clock over', () => {
    withTimers(() => {
      const clock = new IdleClock();
      clock.enter('/doctor', 60);
      mock.timers.tick(60_000);
      clock.touch();
      assert.equal(at(clock), null);
      mock.timers.tick(59_000);
      assert.equal(at(clock), null);
      mock.timers.tick(1_000);
      assert.equal(at(clock), '/doctor');
    });
  });

  it('drops the question when the screen changes (paid on the phone while the question was up)', () => {
    withTimers(() => {
      const clock = new IdleClock();
      clock.enter('/pay/upi', 300);
      mock.timers.tick(300_000);
      assert.equal(at(clock), '/pay/upi');
      clock.enter('/paid', 60);
      assert.equal(at(clock), null);
      mock.timers.tick(59_999);
      assert.equal(at(clock), null, 'the new screen gets its own full limit');
      mock.timers.tick(1);
      assert.equal(at(clock), '/paid');
    });
  });

  it("never lets the last screen's clock ask on the next one", () => {
    withTimers(() => {
      const clock = new IdleClock();
      clock.enter('/patient', 10);
      mock.timers.tick(9_000);
      clock.enter('/ticket', 30);
      mock.timers.tick(2_000);
      assert.equal(at(clock), null);
    });
  });

  it('never asks where there is no limit', () => {
    withTimers(() => {
      const clock = new IdleClock();
      clock.enter('/pay/upi', 300);
      mock.timers.tick(299_000);
      clock.enter('/', null);
      mock.timers.tick(3_600_000);
      assert.equal(at(clock), null);
    });
  });

  it('stop() takes the question away and waits for the next screen or touch', () => {
    withTimers(() => {
      const clock = new IdleClock();
      clock.enter('/register', 60);
      mock.timers.tick(60_000);
      clock.stop();
      assert.equal(at(clock), null);
      mock.timers.tick(600_000);
      assert.equal(at(clock), null);
    });
  });

  it('tells subscribers only when the question appears or goes', () => {
    withTimers(() => {
      const clock = new IdleClock();
      let calls = 0;
      const unsubscribe = clock.subscribe(() => calls++);
      clock.enter('/find', 60);
      clock.touch();
      assert.equal(calls, 0);
      mock.timers.tick(60_000);
      assert.equal(calls, 1);
      clock.touch();
      assert.equal(calls, 2);
      unsubscribe();
      mock.timers.tick(60_000);
      assert.equal(calls, 2);
    });
  });
});
