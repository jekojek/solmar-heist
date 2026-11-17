// Solmar Heist — pedestrians: sunny-day crowds that stroll the sidewalks,
// scatter when a car barrels at them or a shot rings out, and occasionally
// drop a little cash when punched (which, fairly, raises the wanted level).
import { mulberry32 } from './city.js';
import { collideCircle } from './vehicles.js';

const SHIRTS = [0xe74c3c, 0x2ecc71, 0xf39c12, 0x9b59b6, 0x1abc9c, 0xecf0f1, 0x34495e, 0xfd79a8];

export function createPedestrians(scene, colliders, streetLines) {
  const rand = mulberry32(4242);
  const peds = [];

  function makePed(x, z) {
    const g = new THREE.Group();
    const shirt = new THREE.MeshLambertMaterial({ color: SHIRTS[Math.floor(rand() * SHIRTS.length)] });
    const skin = new THREE.MeshLambertMaterial({ color: [0xc98d64, 0x8d5524, 0xe8b98a][Math.floor(rand() * 3)] });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.7, 0.3), shirt);
    body.position.y = 1.1;
    g.add(body);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.38, 0.36), skin);
    head.position.y = 1.68;
    g.add(head);
    const legMat = new THREE.MeshLambertMaterial({ color: 0x2b2f36 });
    const legs = [];
    for (const sx of [-0.14, 0.14]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.72, 0.22), legMat);
      leg.geometry.translate(0, -0.36, 0);
      leg.position.set(sx, 0.72, 0);
      g.add(leg);
      legs.push(leg);
    }
    g.position.set(x, 0, z);
    scene.add(g);
    const ped = {
      mesh: g, pos: g.position, heading: rand() * Math.PI * 2,
      speed: 1.2 + rand() * 1.2, state: 'walk', target: null,
      phase: rand() * 6, health: 50, down: 0, fleeTimer: 0,
    };
    g.userData.pedRef = ped;
    ped.target = randomSidewalkPoint(ped);
    peds.push(ped);
    return ped;
  }

  function randomSidewalkPoint(ped) {
    // A point on a sidewalk: a street line offset by ~8, somewhere in the city.
    const s = streetLines[Math.floor(rand() * streetLines.length)];
    const along = -190 + rand() * 380;
    const off = (rand() < 0.5 ? -1 : 1) * (8 + rand() * 2);
    if (rand() < 0.5) return { x: along, z: s + off };
    return { x: s + off, z: along };
  }

  for (let i = 0; i < 26; i++) {
    const p = randomSidewalkPoint();
    makePed(p.x, p.z);
  }

  function scare(pos, radius) {
    for (const p of peds) {
      if (p.down > 0) continue;
      const d = Math.hypot(p.pos.x - pos.x, p.pos.z - pos.z);
      if (d < radius) {
        p.state = 'flee';
        p.fleeTimer = 3 + Math.random() * 2;
        // Run away from the scare.
        const a = Math.atan2(p.pos.x - pos.x, p.pos.z - pos.z);
        p.target = { x: p.pos.x + Math.sin(a) * 30, z: p.pos.z + Math.cos(a) * 30 };
      }
    }
  }

  function update(dt, playerPos, playerSpeed, playerCar) {
    for (const p of peds) {
      if (p.down > 0) {
        p.down -= dt;
        p.mesh.rotation.x = p.down > 0 ? -Math.PI / 2 * Math.min(1, (3 - p.down)) : 0;
        if (p.down <= 0) {
          p.mesh.rotation.x = 0;
          p.health = 50;
          p.state = 'flee';
          p.fleeTimer = 4;
          p.target = randomSidewalkPoint(p);
        }
        continue;
      }
      // A fast car nearby scares pedestrians off the road.
      const danger = playerCar || playerPos;
      if (danger) {
        const d = Math.hypot(p.pos.x - danger.x, p.pos.z - danger.z);
        const fast = playerCar ? Math.abs(playerCar.speed) > 8 : playerSpeed > 6;
        if (d < 7 && fast) scare(danger, 12);
      }
      if (p.state === 'flee') {
        p.fleeTimer -= dt;
        if (p.fleeTimer <= 0) { p.state = 'walk'; p.target = randomSidewalkPoint(p); }
      }
      const t = p.target;
      const dx = t.x - p.pos.x;
      const dz = t.z - p.pos.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 1.5) { p.target = randomSidewalkPoint(p); continue; }
      const want = Math.atan2(dx, dz);
      let diff = want - p.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      p.heading += Math.max(-2.4 * dt, Math.min(2.4 * dt, diff));
      const sp = p.state === 'flee' ? 5.5 : p.speed;
      p.pos.x += Math.sin(p.heading) * sp * dt;
      p.pos.z += Math.cos(p.heading) * sp * dt;
      collideCircle(p.pos, 0.5, colliders);
      p.mesh.position.copy(p.pos);
      p.mesh.rotation.y = p.heading;
      p.phase += dt * sp * 2.2;
      const swing = Math.sin(p.phase) * 0.5;
      p.mesh.children.forEach((c, i) => {
        if (i >= 2) c.rotation.x = i === 2 ? swing : -swing;
      });
    }
  }

  return { peds, scare, update, makePed };
}
