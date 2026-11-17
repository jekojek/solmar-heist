// Solmar Heist — cars: the mesh factory, arcade driving physics for the
// player's car, parked cars to steal, and traffic that loops the street grid.
import { CAR, CAR_COLORS, CAR_NAMES } from './config.js';
import { mulberry32 } from './city.js';

const CAR_RADIUS = 1.7;

export function createCarMesh(name, color, isPolice) {
  const g = new THREE.Group();
  const paint = new THREE.MeshLambertMaterial({ color });
  const glass = new THREE.MeshLambertMaterial({ color: 0x1a2a3a });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.62, 4.4), paint);
  body.position.y = 0.55;
  g.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.55, 2.2), glass);
  cabin.position.set(0, 1.1, -0.2);
  g.add(cabin);
  const lightMat = new THREE.MeshLambertMaterial({ color: 0xfff6c0, emissive: 0xaa9933 });
  for (const sx of [-0.7, 0.7]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.18, 0.1), lightMat);
    hl.position.set(sx, 0.6, 2.22);
    g.add(hl);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.18, 0.1), new THREE.MeshLambertMaterial({ color: 0xcc2222, emissive: 0x661111 }));
    tl.position.set(sx, 0.6, -2.22);
    g.add(tl);
  }
  if (isPolice) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.22, 0.5), new THREE.MeshLambertMaterial({ color: 0x222222 }));
    bar.position.set(0, 1.5, -0.2);
    g.add(bar);
    const red = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.4), new THREE.MeshLambertMaterial({ color: 0xff2222, emissive: 0xff2222 }));
    red.position.set(-0.32, 1.62, -0.2);
    const blue = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.4), new THREE.MeshLambertMaterial({ color: 0x2244ff, emissive: 0x2244ff }));
    blue.position.set(0.32, 1.62, -0.2);
    g.add(red, blue);
    g.userData.lightRed = red;
    g.userData.lightBlue = blue;
  }
  const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.28, 10);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x14181c });
  const wheels = [];
  for (const [wx, wz] of [[-0.95, 1.45], [0.95, 1.45], [-0.95, -1.45], [0.95, -1.45]]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(wx, 0.36, wz);
    g.add(w);
    wheels.push(w);
  }
  g.userData.wheels = wheels;
  g.userData.name = name;
  return g;
}

// Push a circle (x, z, radius) out of every building box it overlaps.
// Returns true when a push happened (a crash).
export function collideCircle(pos, radius, colliders) {
  let hit = false;
  for (const b of colliders) {
    const cx = Math.max(b.minX, Math.min(pos.x, b.maxX));
    const cz = Math.max(b.minZ, Math.min(pos.z, b.maxZ));
    const dx = pos.x - cx;
    const dz = pos.z - cz;
    const d2 = dx * dx + dz * dz;
    if (d2 < radius * radius) {
      hit = true;
      if (d2 > 1e-6) {
        const d = Math.sqrt(d2);
        pos.x = cx + (dx / d) * radius;
        pos.z = cz + (dz / d) * radius;
      } else {
        // Centre inside the box: push out along the smallest penetration.
        const pl = pos.x - b.minX;
        const pr = b.maxX - pos.x;
        const pt = pos.z - b.minZ;
        const pb = b.maxZ - pos.z;
        const m = Math.min(pl, pr, pt, pb);
        if (m === pl) pos.x = b.minX - radius;
        else if (m === pr) pos.x = b.maxX + radius;
        else if (m === pt) pos.z = b.minZ - radius;
        else pos.z = b.maxZ + radius;
      }
    }
  }
  const half = 208;
  pos.x = Math.max(-half, Math.min(half + 44, pos.x));
  pos.z = Math.max(-half, Math.min(half, pos.z));
  return hit;
}

export function createVehicles(scene, colliders, streetLines) {
  const rand = mulberry32(777);
  const cars = [];
  const traffic = [];

  function addCar(mesh, x, z, heading, opts) {
    const car = {
      mesh, pos: mesh.position, heading, speed: 0, steer: 0,
      name: mesh.userData.name || 'Viento',
      isPolice: !!opts.isPolice,
      parked: !!opts.parked,
      traffic: !!opts.traffic,
      route: opts.route || null,
      routeIdx: 0,
      cruise: 8 + rand() * 4,
      stuck: 0,
    };
    mesh.position.set(x, 0, z);
    mesh.rotation.y = heading;
    scene.add(mesh);
    cars.push(car);
    return car;
  }

  // Parked cars along the streets, free to steal.
  const spots = [
    [-52, 6, 0], [52, -6, Math.PI], [0, 6, 0], [-104, -6, Math.PI], [104, 6, 0],
    [-156, 6, 0], [156, -6, Math.PI], [-52, -6, Math.PI], [52, 6, 0], [0, -6, Math.PI],
    [-104, 6, 0], [104, -6, Math.PI], [-208, 6, 0], [208, -6, Math.PI],
  ];
  spots.forEach(([x, z, h], i) => {
    addCar(createCarMesh(CAR_NAMES[i % CAR_NAMES.length], CAR_COLORS[i % CAR_COLORS.length], false), x, z, h, { parked: true });
  });
  // The yellow Marlin GT for Job 2, parked by the plaza fountain.
  const targetCar = addCar(createCarMesh('Marlin GT', 0xf2c230, false), 44, 30, Math.PI / 2, { parked: true });
  targetCar.isMissionTarget = true;

  // Traffic: rectangular loops around city blocks.
  function loopRoute(bx, bz) {
    const pitch = 52;
    const x0 = bx * pitch;
    const z0 = bz * pitch;
    return [
      [x0, z0], [x0 + pitch, z0], [x0 + pitch, z0 + pitch], [x0, z0 + pitch],
    ];
  }
  const loops = [];
  for (let bx = -3; bx <= 2; bx++) for (let bz = -3; bz <= 2; bz++) loops.push(loopRoute(bx, bz));
  for (let i = 0; i < 14; i++) {
    const route = loops[Math.floor(rand() * loops.length)];
    const start = route[Math.floor(rand() * 4)];
    const car = addCar(
      createCarMesh(CAR_NAMES[i % CAR_NAMES.length], CAR_COLORS[(i + 2) % CAR_COLORS.length], false),
      start[0], start[1], 0, { traffic: true, route },
    );
    traffic.push(car);
  }

  function nearestCar(pos, maxDist, exclude) {
    let best = null;
    let bestD = maxDist;
    for (const c of cars) {
      if (c === exclude || c.isPolice) continue;
      const d = Math.hypot(c.pos.x - pos.x, c.pos.z - pos.z);
      if (d < bestD) { bestD = d; best = c; }
    }
    return best;
  }

  function drivePlayer(dt, car, input, onCrash) {
    const fwd = (input.forward ? 1 : 0) - (input.back ? 1 : 0);
    const steerIn = (input.left ? 1 : 0) - (input.right ? 1 : 0);
    const grip = input.handbrake ? CAR.handbrakeGrip : CAR.grip;
    if (fwd > 0) car.speed += CAR.accel * dt * (1 - car.speed / CAR.maxSpeed);
    else if (fwd < 0) {
      if (car.speed > 0.5) car.speed -= CAR.brake * dt;
      else car.speed -= CAR.accel * 0.55 * dt;
    } else {
      car.speed -= Math.sign(car.speed) * 8 * dt;
      if (Math.abs(car.speed) < 0.3) car.speed = 0;
    }
    car.speed = Math.max(-CAR.maxReverse, Math.min(CAR.maxSpeed, car.speed));
    const steerTarget = steerIn * CAR.steer * Math.min(1, Math.abs(car.speed) / 8 + 0.25);
    car.steer += (steerTarget - car.steer) * Math.min(1, dt * 8);
    const turn = car.steer * (car.speed / CAR.maxSpeed) * 2.2 * Math.sign(car.speed || 1);
    car.heading += turn * dt * (input.handbrake ? 1.6 : 1);
    if (input.handbrake && Math.abs(car.speed) > 6) car.speed *= (1 - dt * 0.7);
    const nx = car.pos.x + Math.sin(car.heading) * car.speed * dt;
    const nz = car.pos.z + Math.cos(car.heading) * car.speed * dt;
    const before = { x: car.pos.x, z: car.pos.z };
    car.pos.x = nx;
    car.pos.z = nz;
    if (collideCircle(car.pos, CAR_RADIUS, colliders)) {
      const impact = Math.abs(car.speed);
      car.pos.x = before.x;
      car.pos.z = before.z;
      if (impact > 8) {
        car.speed *= -0.25;
        if (onCrash) onCrash(impact);
      } else {
        car.speed *= 0.4;
      }
    }
    // Nudge away from other cars.
    for (const o of cars) {
      if (o === car) continue;
      const dx = car.pos.x - o.pos.x;
      const dz = car.pos.z - o.pos.z;
      const d = Math.hypot(dx, dz);
      if (d < 3.4 && d > 0.01) {
        car.pos.x = o.pos.x + (dx / d) * 3.4;
        car.pos.z = o.pos.z + (dz / d) * 3.4;
        if (Math.abs(car.speed) > 10 && o.traffic) o.speed = 0;
        if (Math.abs(car.speed) > 12 && onCrash) onCrash(Math.abs(car.speed) * 0.6);
      }
    }
    car.mesh.position.copy(car.pos);
    car.mesh.rotation.y = car.heading;
    car.mesh.rotation.z = -car.steer * 0.06 * Math.sign(car.speed || 1);
    const spin = car.speed * dt * 2.8;
    for (const w of car.mesh.userData.wheels) w.rotation.x += spin;
  }

  function updateTraffic(dt, playerPos, playerCar) {
    for (const c of traffic) {
      const target = c.route[c.routeIdx];
      const dx = target[0] - c.pos.x;
      const dz = target[1] - c.pos.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 3) {
        c.routeIdx = (c.routeIdx + 1) % c.route.length;
        continue;
      }
      const wantHeading = Math.atan2(dx, dz);
      let diff = wantHeading - c.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      c.heading += Math.max(-1.6 * dt, Math.min(1.6 * dt, diff));
      // Slow down for the car ahead or the player.
      let slow = false;
      for (const o of cars) {
        if (o === c) continue;
        const ox = o.pos.x - c.pos.x;
        const oz = o.pos.z - c.pos.z;
        const od = Math.hypot(ox, oz);
        if (od < 7 && od > 0.01) {
          const ahead = (ox * Math.sin(c.heading) + oz * Math.cos(c.heading)) / od;
          if (ahead > 0.6) { slow = true; break; }
        }
      }
      if (playerCar && playerCar !== c) {
        const d = Math.hypot(playerCar.pos.x - c.pos.x, playerCar.pos.z - c.pos.z);
        if (d < 6) slow = true;
      }
      const want = slow ? 0 : c.cruise;
      c.speed += (want - c.speed) * Math.min(1, dt * 1.5);
      c.pos.x += Math.sin(c.heading) * c.speed * dt;
      c.pos.z += Math.cos(c.heading) * c.speed * dt;
      collideCircle(c.pos, CAR_RADIUS, colliders);
      c.mesh.position.copy(c.pos);
      c.mesh.rotation.y = c.heading;
      const spin = c.speed * dt * 2.8;
      for (const w of c.mesh.userData.wheels) w.rotation.x += spin;
    }
    void playerPos;
  }

  return { cars, traffic, targetCar, addCar, nearestCar, drivePlayer, updateTraffic };
}
