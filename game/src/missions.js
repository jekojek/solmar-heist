// Solmar Heist — the story: three jobs from fixer Mira Solano. Each job is a
// chain of steps with a map target, a beacon pillar, and a reward. The module
// owns the objective text, the timer, and the beacon meshes.
import { MISSIONS } from './config.js';

export function createMissions(scene) {
  let index = 0;
  let completed = [];
  let active = null;      // { mission, step }
  let stepTimer = 0;

  // Beacon: a glowing pillar + a bouncing diamond over the current target.
  const beaconMat = new THREE.MeshBasicMaterial({ color: 0xffd76a, transparent: true, opacity: 0.42 });
  const beacon = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 70, 12, 1, true), beaconMat);
  beacon.visible = false;
  scene.add(beacon);
  const diamondMat = new THREE.MeshBasicMaterial({ color: 0xffd76a });
  const diamond = new THREE.Mesh(new THREE.OctahedronGeometry(2.2), diamondMat);
  diamond.visible = false;
  scene.add(diamond);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xffd76a, transparent: true, opacity: 0.7 });
  const ring = new THREE.Mesh(new THREE.RingGeometry(3, 4, 24), ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.visible = false;
  scene.add(ring);

  let time = 0;

  function startMission(i) {
    const m = MISSIONS[i];
    if (!m) return null;
    index = i;
    active = { mission: m, step: 0 };
    const step = m.steps[0];
    stepTimer = step.timer || 0;
    return m;
  }

  function currentTarget() {
    if (!active) return null;
    return active.mission.steps[active.step].target;
  }

  function objectiveText() {
    if (!active) {
      if (completed.length >= MISSIONS.length) return { name: 'DEBT PAID — FREE ROAM', text: 'Solmar Bay is yours, Raka. Spend it well.' };
      return { name: 'FREE ROAM', text: 'Press N to take the next job from Mira Solano.' };
    }
    const step = active.mission.steps[active.step];
    let text = step.text;
    if (step.timer) text += ` — ${Math.max(0, Math.ceil(stepTimer))}s left`;
    return { name: active.mission.name, text };
  }

  // Returns 'done' | 'failed' | 'step' | null. `ctx` carries the live world.
  function update(dt, ctx) {
    time += dt;
    if (!active) {
      beacon.visible = false;
      diamond.visible = false;
      ring.visible = false;
      return null;
    }
    const step = active.mission.steps[active.step];
    const [tx, , tz] = step.target;
    beacon.visible = true;
    diamond.visible = true;
    ring.visible = true;
    beacon.position.set(tx, 30, tz);
    diamond.position.set(tx, 8 + Math.sin(time * 3) * 1.2, tz);
    diamond.rotation.y = time * 2;
    ring.position.set(tx, 0.15, tz);
    const pulse = 1 + Math.sin(time * 4) * 0.12;
    ring.scale.set(pulse, pulse, 1);
    if (step.timer) {
      stepTimer -= dt;
      if (stepTimer <= 0) return 'failed';
    }
    const px = ctx.playerCar ? ctx.playerCar.pos.x : ctx.player.pos.x;
    const pz = ctx.playerCar ? ctx.playerCar.pos.z : ctx.player.pos.z;
    const dist = Math.hypot(px - tx, pz - tz);
    if (step.needCar && ctx.playerCar && ctx.playerCar.name !== step.needCar) {
      // Wrong car: the step cannot complete here.
      if (dist < step.radius) return null;
    }
    if (dist < step.radius) {
      if (step.needCar && (!ctx.playerCar || ctx.playerCar.name !== step.needCar)) return null;
      active.step += 1;
      if (active.step >= active.mission.steps.length) {
        completed.push(active.mission.id);
        const done = active.mission;
        active = null;
        beacon.visible = false;
        diamond.visible = false;
        ring.visible = false;
        return { result: 'done', mission: done };
      }
      const next = active.mission.steps[active.step];
      stepTimer = next.timer || 0;
      return { result: 'step', mission: active.mission };
    }
    return null;
  }

  function abort() {
    active = null;
    beacon.visible = false;
    diamond.visible = false;
    ring.visible = false;
  }

  return {
    get index() { return index; },
    get completed() { return completed; },
    get active() { return active; },
    get nextIndex() { return completed.length; },
    startMission,
    currentTarget,
    objectiveText,
    update,
    abort,
    restore(savedIndex, savedCompleted) {
      index = savedIndex || 0;
      completed = savedCompleted || [];
    },
  };
}
