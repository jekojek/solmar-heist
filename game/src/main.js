// Solmar Heist — boot and the one loop. Owns the screens (title, play,
// paused, mission end, busted, wasted), entering and stealing cars, crime
// consequences, the mission flow, saving, and the ?shot= presets the
// screenshots are staged from.
import { CAR, MISSIONS, PLAYER } from './config.js';
import { createAudio } from './audio.js';
import { createInput } from './input.js';
import { buildCity } from './city.js';
import { createVehicles, createCarMesh } from './vehicles.js';
import { createPlayer } from './player.js';
import { createPedestrians } from './pedestrians.js';
import { createPolice } from './police.js';
import { createMissions } from './missions.js';
import { createCombat } from './combat.js';
import { createHud } from './hud.js';
import { createCamera } from './camera.js';
import { saveGame, loadGame, hasSave } from './save.js';
import { createSelfTest } from './selftest.js';

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const canvas = document.getElementById('game');
const statusEl = document.getElementById('status');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 900);
camera.position.set(-120, 60, 160);

const audio = createAudio();
const input = createInput(canvas);
const hud = createHud();
const cam = createCamera(camera, canvas);

const { colliders, streetLines } = buildCity(scene);
const vehicles = createVehicles(scene, colliders, streetLines);
const { player, update: updatePlayer } = createPlayer(scene, colliders);
const peds = createPedestrians(scene, colliders, streetLines);
const police = createPolice(scene, colliders, vehicles);
const missions = createMissions(scene);
const combat = createCombat(scene);

// Raka starts with his own Viento parked by Mira's garage — entering it is free.
const ownCar = vehicles.addCar(createCarMesh('Viento', 0x2e7dd8, false), -118, 104, 0, { parked: true });
ownCar.owned = true;

const state = {
  cash: 250,
  screen: 'title',
  missionFailed: false,
  lastRamAt: 0,
  time: 0,
  frames: 0,
};

// Ammo crates scattered around the city: walk over one for +12 rounds.
const crateMat = new THREE.MeshLambertMaterial({ color: 0x27ae60, emissive: 0x1a6b3a });
const crates = [];
for (const [cx, cz] of [[-52, 52], [52, -52], [104, 52], [-104, -104], [0, 156], [156, 0]]) {
  const crate = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2), crateMat);
  crate.position.set(cx, 0.6, cz);
  scene.add(crate);
  crates.push(crate);
}

function showScreen(id) {
  for (const s of ['title', 'pause', 'missionEnd', 'busted', 'wasted']) {
    document.getElementById(s).classList.toggle('hidden', s !== id);
  }
  hud.show(id === null);
}

function setStatus(text) { statusEl.textContent = text; }

function startGame(mode) {
  audio.unlock();
  state.screen = 'play';
  showScreen(null);
  if (mode === 'story') {
    beginMission(0);
    hud.toast('Job 1: First Pickup — Mira is waiting on that package.');
  } else if (mode === 'continue') {
    const save = loadGame();
    if (save) {
      state.cash = save.cash;
      player.health = save.health;
      player.ammo = save.ammo;
      missions.restore(save.missionIndex, save.completed);
      player.pos.set(save.pos[0], 0, save.pos[2]);
      player.heading = save.heading || 0;
      cam.snapBehind(player.heading);
      hud.toast('Save loaded. Welcome back to Solmar Bay.');
    }
  }
  setStatus('Playing Solmar Heist');
}

function beginMission(i) {
  const m = missions.startMission(i);
  if (!m) return;
  const step = m.steps[0];
  if (step.startWanted) police.wanted = step.startWanted;
  hud.toast(m.brief, 5000);
  audio.sirenBlip();
}

function enterCar(car) {
  player.inCar = car;
  car.parked = false;
  player.mesh.visible = false;
  cam.snapBehind(car.heading);
  if (!car.owned && !car.stolenBefore) {
    car.stolenBefore = true;
    police.addCrime(1);
    hud.toast('Car stolen! The SBPD noticed.', 3000);
    audio.sirenBlip();
  }
}

function exitCar() {
  const car = player.inCar;
  if (!car) return;
  player.inCar = null;
  player.mesh.visible = true;
  player.pos.set(car.pos.x + Math.sin(car.heading + Math.PI / 2) * 2.4, 0, car.pos.z + Math.cos(car.heading + Math.PI / 2) * 2.4);
  player.heading = car.heading;
  cam.snapBehind(player.heading);
}

function respawnHospital(reason) {
  if (player.inCar) { player.inCar = null; player.mesh.visible = true; }
  player.pos.set(118, 0, 114);
  player.heading = Math.PI;
  player.health = PLAYER.maxHealth;
  police.wanted = 0;
  cam.snapBehind(player.heading);
  state.screen = 'play';
  showScreen(null);
  hud.toast(reason);
}

function onRam() {
  const now = state.time;
  if (now - state.lastRamAt < 1) return;
  state.lastRamAt = now;
  player.health -= 9;
  hud.setDamage(0.8);
  audio.crash();
  if (player.health <= 0) wasted();
}

function busted() {
  if (state.screen !== 'play') return;
  const loss = Math.min(state.cash, 300);
  state.cash -= loss;
  missions.abort();
  state.screen = 'busted';
  document.getElementById('bustedText').textContent =
    `The Solmar Bay police hauled Raka in. Bail cost him $${loss} — but Mira still wants her money.`;
  showScreen('busted');
  audio.fail();
  setStatus('Busted by the police');
}

function wasted() {
  if (state.screen !== 'play') return;
  const loss = Math.min(state.cash, 300);
  state.cash -= loss;
  missions.abort();
  state.screen = 'wasted';
  showScreen('wasted');
  audio.fail();
  setStatus('Wasted');
}

function missionEndUI(title, text, nextLabel, failed) {
  state.missionFailed = failed;
  document.getElementById('endTitle').textContent = title;
  document.getElementById('endText').textContent = text;
  document.getElementById('btnNextMission').textContent = nextLabel;
  state.screen = 'missionEnd';
  showScreen('missionEnd');
}

// --- Buttons ---
document.getElementById('btnStory').addEventListener('click', () => startGame('story'));
document.getElementById('btnFree').addEventListener('click', () => startGame('free'));
document.getElementById('btnContinue').addEventListener('click', () => startGame('continue'));
document.getElementById('btnResume').addEventListener('click', () => { state.screen = 'play'; showScreen(null); });
document.getElementById('btnRestartMission').addEventListener('click', () => {
  if (missions.active || missions.nextIndex < MISSIONS.length) {
    beginMission(missions.active ? missions.index : missions.nextIndex);
    state.screen = 'play';
    showScreen(null);
  }
});
document.getElementById('btnSave').addEventListener('click', () => {
  const ok = saveGame({ cash: state.cash, player, missions });
  hud.toast(ok ? 'Game saved.' : 'Save failed — storage unavailable.');
});
document.getElementById('btnQuit').addEventListener('click', () => { state.screen = 'title'; showScreen('title'); });
document.getElementById('btnNextMission').addEventListener('click', () => {
  state.screen = 'play';
  showScreen(null);
  if (state.missionFailed) beginMission(missions.index);
  else if (missions.nextIndex < MISSIONS.length) beginMission(missions.nextIndex);
});
document.getElementById('btnKeepPlaying').addEventListener('click', () => { state.screen = 'play'; showScreen(null); });
document.getElementById('btnBustedOk').addEventListener('click', () => respawnHospital('Back on the streets — lay low for a while.'));
document.getElementById('btnWastedOk').addEventListener('click', () => respawnHospital('Patched up at St. Marina. The debt is still waiting.'));
if (!hasSave()) document.getElementById('btnContinue').style.display = 'none';

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
canvas.addEventListener('mousedown', () => audio.unlock());

// --- Screenshot staging (?shot=...) ---
function stageShot(name) {
  state.screen = 'play';
  showScreen(null);
  if (name === 'start') {
    state.screen = 'title';
    showScreen('title');
    return;
  }
  if (name === 'chase') {
    // Police chase while driving: Raka in his Viento, 3 stars, cruisers closing in.
    const car = ownCar;
    car.pos.set(-60, 0, 0);
    car.heading = Math.PI / 2;
    car.speed = 24;
    car.mesh.position.copy(car.pos);
    car.mesh.rotation.y = car.heading;
    enterCar(car);
    police.wanted = 3;
    // Two cruisers staged to pull alongside the player, so the chase reads in
    // the frame (their lights still flash and they still chase in live play).
    state.stagedCruisers = [
      police.placeCruiser(0, 0, Math.PI / 2),
      police.placeCruiser(0, 0, Math.PI / 2),
    ];
    beginMission(0);
    cam.snapBehind(car.heading);
  } else if (name === 'foot') {
    player.pos.set(30, 0, 46);
    player.heading = Math.PI;
    cam.snapBehind(player.heading);
    beginMission(0);
  } else if (name === 'mission') {
    const car = ownCar;
    car.pos.set(60, 0, -104);
    car.heading = Math.PI / 2;
    car.speed = 26;
    car.mesh.position.copy(car.pos);
    car.mesh.rotation.y = car.heading;
    enterCar(car);
    beginMission(0);
    cam.snapBehind(car.heading);
  }
  state.cash = 2350;
  player.health = 92;
  player.ammo = 18;
}
if (shot) stageShot(shot);

// --- The loop ---
const STEP = 1 / 60;
let acc = 0;
let last = performance.now();
let driveOverride = null;
const selfTest = params.get('selftest')
  ? createSelfTest({
    state, player, police, missions, ownCar, startGame, saveGame, loadGame,
    setDrive: (v) => { driveOverride = v; },
  })
  : null;

function update(dt) {
  state.time += dt;
  if (state.screen === 'title') {
    // Slow orbit over the city behind the title screen.
    const a = state.time * 0.045;
    camera.position.set(Math.cos(a) * 150, 62, Math.sin(a) * 150);
    camera.lookAt(20, 8, 20);
    vehicles.updateTraffic(dt, player.pos, player.inCar);
    peds.update(dt, player.pos, 0, null);
    input.endFrame();
    return;
  }
  if (state.screen !== 'play') { input.endFrame(); return; }

  // Keys.
  if (input.wasPressed('KeyM')) {
    const muted = audio.toggleMute();
    hud.toast(muted ? 'Sound muted (M to unmute)' : 'Sound on');
  }
  if (input.wasPressed('KeyP') || input.wasPressed('Escape')) {
    state.screen = 'paused';
    showScreen('pause');
    input.endFrame();
    return;
  }
  if (input.wasPressed('KeyN') && !missions.active && missions.nextIndex < MISSIONS.length) {
    beginMission(missions.nextIndex);
  }
  if (input.wasPressed('KeyQ') && !player.inCar) {
    player.pistolDrawn = !player.pistolDrawn;
    hud.toast(player.pistolDrawn ? 'Pistol drawn — F to shoot' : 'Pistol holstered');
  }
  if (input.wasPressed('KeyE')) {
    if (player.inCar) exitCar();
    else {
      const car = vehicles.nearestCar(player.pos, 4.5, null);
      if (car) enterCar(car);
    }
  }
  if (input.wasPressed('KeyF') && !player.inCar) {
    if (player.pistolDrawn) {
      const res = combat.shoot(player, camera, peds, police,
        (n) => police.addCrime(n),
        (what) => {
          if (what === 'ped') { state.cash += 40; hud.toast('Lifted $40 off the pavement.'); }
        });
      if (res === 'empty') hud.toast('Out of ammo — find a green crate.');
      else if (res) { audio.shoot(); peds.scare(player.pos, 26); }
    } else {
      const hit = combat.punch(player, peds, police,
        (n) => police.addCrime(n),
        (what) => {
          if (what === 'ped') { state.cash += 40; hud.toast('Lifted $40 off the pavement.'); audio.cash(); }
        });
      if (hit) { audio.punch(); peds.scare(player.pos, 14); }
    }
  }

  // World.
  if (player.inCar) {
    vehicles.drivePlayer(dt, player.inCar, driveOverride || input, (impact) => {
      if (impact > 14) {
        player.health -= 5;
        hud.setDamage(0.6);
        audio.crash();
        if (player.health <= 0) wasted();
      } else {
        audio.crash();
      }
    });
    // Screenshot staging cruises at a steady speed so the chase stays framed.
    if ((shot === 'chase' || shot === 'mission') && player.inCar) player.inCar.speed = 22;
    // Running over a pedestrian is a crime.
    for (const ped of peds.peds) {
      if (ped.down > 0) continue;
      const d = Math.hypot(ped.pos.x - player.inCar.pos.x, ped.pos.z - player.inCar.pos.z);
      if (d < 2.2 && Math.abs(player.inCar.speed) > 4) {
        ped.down = 3;
        ped.health = 0;
        police.addCrime(1);
        player.inCar.speed *= 0.85;
        audio.crash();
        peds.scare(player.inCar.pos, 24);
        hud.toast('You hit a pedestrian! Wanted level up.');
      }
    }
  } else {
    updatePlayer(dt, driveOverride || input, cam.yaw);
  }
  vehicles.updateTraffic(dt, player.pos, player.inCar);
  peds.update(dt, player.pos, player.speed, player.inCar);
  police.update(dt, player, player.inCar, busted, onRam);
  combat.update(dt);
  // Screenshot staging: keep the two cruisers pulling alongside the player.
  if (shot === 'chase' && state.stagedCruisers && player.inCar) {
    const car = player.inCar;
    const fx = Math.sin(car.heading);
    const fz = Math.cos(car.heading);
    state.stagedCruisers.forEach((c, i) => {
      const side = i === 0 ? 1 : -1;
      c.pos.x = car.pos.x + fx * 10 + fz * side * 5.5;
      c.pos.z = car.pos.z + fz * 10 - fx * side * 5.5;
      c.heading = car.heading;
      c.speed = car.speed;
      c.mesh.position.copy(c.pos);
      c.mesh.rotation.y = c.heading;
    });
  }

  // Ammo crates.
  for (let i = crates.length - 1; i >= 0; i--) {
    const c = crates[i];
    if (!player.inCar && Math.hypot(c.position.x - player.pos.x, c.position.z - player.pos.z) < 2) {
      player.ammo += 12;
      scene.remove(c);
      crates.splice(i, 1);
      audio.pickup();
      hud.toast('+12 pistol ammo');
    }
  }

  // Missions.
  const result = missions.update(dt, { player, playerCar: player.inCar });
  if (result === 'failed') {
    audio.fail();
    missionEndUI('JOB FAILED', 'Mira: "Too slow, Raka. The marina deal went cold. We do it again — faster."', 'RETRY JOB', true);
  } else if (result && result.result === 'step') {
    audio.pickup();
    hud.toast(result.mission.steps[missions.active.step].text, 3500);
  } else if (result && result.result === 'done') {
    state.cash += result.mission.reward;
    player.ammo += 12;
    audio.missionDone();
    audio.cash();
    if (missions.nextIndex >= MISSIONS.length) {
      missionEndUI('DEBT PAID!', `All three jobs done. Mira tore up the $50,000 note — Raka is free, $${result.mission.reward.toLocaleString('en-US')} richer, and Solmar Bay is his.`, 'FREE ROAM', false);
    } else {
      missionEndUI('JOB DONE', `Mira paid $${result.mission.reward.toLocaleString('en-US')} for "${result.mission.name}". ${MISSIONS.length - missions.nextIndex} job${MISSIONS.length - missions.nextIndex === 1 ? '' : 's'} left on the debt.`, 'NEXT JOB', false);
    }
  }

  // Camera + audio + HUD.
  const target = player.inCar ? player.inCar.pos : player.pos;
  const heading = player.inCar ? player.inCar.heading : player.heading;
  cam.update(dt, target, heading, !!player.inCar, input, colliders);
  const speed01 = player.inCar ? Math.abs(player.inCar.speed) / CAR.maxSpeed : player.speed / 11;
  audio.setEngine(speed01, !!player.inCar);
  audio.setSiren(police.wanted > 0, dt);
  hud.update({
    health: player.health,
    cash: state.cash,
    ammo: player.ammo,
    pistolDrawn: player.pistolDrawn,
    wanted: police.wanted,
    objective: missions.objectiveText(),
    speed: player.inCar ? player.inCar.speed : player.speed,
    playerCar: player.inCar,
    player,
    heading: player.inCar ? player.inCar.heading : player.heading,
    target: missions.currentTarget(),
    traffic: vehicles.traffic,
    police: police.cruisers,
  });
  input.endFrame();
}

function frame(now) {
  requestAnimationFrame(frame);
  if (selfTest) selfTest.step(state.frames);
  const dtMs = Math.min(250, now - last);
  last = now;
  if (shot && state.time >= 4) {
    // Freeze the staged frame at exactly 4 s of game time so the screenshot
    // captures the composed scene whatever the frame pacing is.
    renderer.render(scene, camera);
    state.frames++;
    window.__shotReady = true;
    return;
  }
  acc += dtMs / 1000;
  let steps = 0;
  while (acc >= STEP && steps < 5) {
    update(STEP);
    acc -= STEP;
    steps++;
  }
  if (steps === 5) acc = 0;
  renderer.render(scene, camera);
  state.frames++;
  if (shot && state.frames === 240) window.__shotReady = true;
}
requestAnimationFrame(frame);
