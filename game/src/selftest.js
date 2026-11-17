// Solmar Heist — in-browser self-test, run only with ?selftest=1. It drives the
// real key path (synthetic KeyboardEvents), enters a car, finishes Job 1,
// exits, fires the pistol, saves/loads and pauses, then reports PASS/FAIL
// lines in the document title and window.__selftest. Never runs in normal play.
export function createSelfTest(ctx) {
  const results = [];
  let done = false;
  const check = (name, ok) => results.push(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  function key(code) {
    window.dispatchEvent(new KeyboardEvent('keydown', { code }));
    window.dispatchEvent(new KeyboardEvent('keyup', { code }));
  }
  function click(id) {
    document.getElementById(id).click();
  }
  function teleportCar(x, z) {
    const car = ctx.player.inCar;
    car.pos.set(x, 0, z);
    car.mesh.position.copy(car.pos);
  }

  function step(frame) {
    if (done) return;
    const { player, police, missions, state } = ctx;
    if (frame === 2) {
      ctx.startGame('free');
      check('start game', state.screen === 'play');
    } else if (frame === 5) {
      player.pos.set(-118, 0, 101);
      const car = ctx.ownCar;
      car.heading = Math.PI / 2;
      car.mesh.rotation.y = car.heading;
      key('KeyE');
    } else if (frame === 8) {
      check('enter car with E', !!player.inCar);
      ctx.setDrive({ forward: true, back: false, left: false, right: false, handbrake: false, run: false });
    } else if (frame === 60) {
      check('car accelerates', player.inCar && player.inCar.speed > 5);
      ctx.setDrive(null);
    } else if (frame === 65) {
      key('KeyN');
    } else if (frame === 68) {
      check('mission 1 starts with N', !!missions.active);
    } else if (frame === 70) {
      teleportCar(196, -120);
    } else if (frame === 85) {
      check('mission step 1 completes at docks', missions.active && missions.active.step === 1);
    } else if (frame === 88) {
      teleportCar(-130, 118);
    } else if (frame === 100) {
      check('mission 1 completes at garage', missions.completed.includes('first-pickup'));
      check('reward paid', state.cash >= 1750);
      click('btnKeepPlaying');
    } else if (frame === 103) {
      check('back to play after job', state.screen === 'play');
    } else if (frame === 108) {
      key('KeyE');
    } else if (frame === 112) {
      check('exit car with E', !player.inCar);
    } else if (frame === 115) {
      ctx.ammoBefore = player.ammo;
      key('KeyQ');
    } else if (frame === 118) {
      key('KeyF');
    } else if (frame === 122) {
      check('pistol fires (ammo spent)', player.ammo === ctx.ammoBefore - 1);
      check('shooting raises wanted', police.wanted >= 1);
    } else if (frame === 125) {
      const ok = ctx.saveGame({ cash: state.cash, player, missions });
      const loaded = ctx.loadGame();
      check('save/load round trip', ok && loaded && loaded.cash === state.cash);
    } else if (frame === 128) {
      key('KeyP');
    } else if (frame === 132) {
      check('pause with P', state.screen === 'paused');
      click('btnResume');
    } else if (frame === 136) {
      check('resume from pause', state.screen === 'play');
    } else if (frame === 140) {
      done = true;
      document.title = `SELFTEST: ${results.join(' | ')}`;
      window.__selftest = { results, done: true };
      window.__shotReady = true;
    }
  }

  return { step, get done() { return done; } };
}
