// Solmar Heist — the wanted system and the Solmar Bay Police Department.
// Stars rise with crimes and fall with quiet time; police cruisers spawn,
// chase, and ram, and officers on foot bust Raka if they catch him.
import { WANTED } from './config.js';
import { createCarMesh, collideCircle } from './vehicles.js';

export function createPolice(scene, colliders, vehicles) {
  const cruisers = [];
  let wanted = 0;
  let quietTimer = 0;
  let spawnTimer = 0;
  let flash = 0;

  function addCrime(stars) {
    if (wanted < WANTED.maxStars) {
      wanted = Math.min(WANTED.maxStars, wanted + stars);
      quietTimer = 0;
    } else {
      quietTimer = 0;
    }
  }

  function spawnCruiser(playerPos) {
    const angle = Math.random() * Math.PI * 2;
    const x = playerPos.x + Math.sin(angle) * 55;
    const z = playerPos.z + Math.cos(angle) * 55;
    return placeCruiser(Math.max(-205, Math.min(205, x)), Math.max(-205, Math.min(205, z)), angle);
  }

  // Place a cruiser at an exact spot (used to stage the cover screenshot).
  function placeCruiser(x, z, heading) {
    const mesh = createCarMesh('SBPD Interceptor', 0x1a1a1a, true);
    const car = vehicles.addCar(mesh, x, z, heading, { isPolice: true });
    car.cruise = 0;
    cruisers.push(car);
    return car;
  }

  function update(dt, player, playerCar, onBusted, onRam) {
    // Wanted decays after quiet time.
    if (wanted > 0) {
      quietTimer += dt;
      if (quietTimer > WANTED.decaySeconds) {
        wanted -= 1;
        quietTimer = 0;
      }
    }
    flash += dt;
    const wantCount = WANTED.policePerStar[wanted] || 0;
    spawnTimer -= dt;
    if (cruisers.length < wantCount && spawnTimer <= 0) {
      spawnCruiser(playerCar ? playerCar.pos : player.pos);
      spawnTimer = 3;
    }
    // Extra cruisers leave when the heat dies down.
    while (cruisers.length > wantCount) {
      const c = cruisers.pop();
      c.mesh.visible = false;
      const i = vehicles.cars.indexOf(c);
      if (i >= 0) vehicles.cars.splice(i, 1);
      scene.remove(c.mesh);
    }
    const target = playerCar ? playerCar.pos : player.pos;
    const targetSpeed = playerCar ? playerCar.speed : player.speed;
    for (const c of cruisers) {
      const dx = target.x - c.pos.x;
      const dz = target.z - c.pos.z;
      const dist = Math.hypot(dx, dz);
      const wantHeading = Math.atan2(dx, dz);
      let diff = wantHeading - c.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      const topSpeed = 26 + wanted * 3.5;
      const wantSpeed = dist > 4 ? Math.min(topSpeed, 14 + dist * 0.55) : topSpeed * 0.4;
      c.speed += (wantSpeed - c.speed) * Math.min(1, dt * 1.2);
      c.heading += Math.max(-2.2 * dt, Math.min(2.2 * dt, diff * 2.4));
      c.pos.x += Math.sin(c.heading) * c.speed * dt;
      c.pos.z += Math.cos(c.heading) * c.speed * dt;
      collideCircle(c.pos, 1.7, colliders);
      c.mesh.position.copy(c.pos);
      c.mesh.rotation.y = c.heading;
      const spin = c.speed * dt * 2.8;
      for (const w of c.mesh.userData.wheels) w.rotation.x += spin;
      // Flashing light bar.
      const on = Math.sin(flash * 10) > 0;
      if (c.mesh.userData.lightRed) {
        c.mesh.userData.lightRed.material.emissiveIntensity = on ? 2.2 : 0.2;
        c.mesh.userData.lightBlue.material.emissiveIntensity = on ? 0.2 : 2.2;
      }
      // Ram the player: damage on contact, and a bust on foot at close range.
      if (dist < 3.6) {
        if (playerCar) {
          if (Math.abs(targetSpeed) < 30 || dist < 2.6) {
            if (onRam) onRam(c);
            // Shove the player's car, then keep it out of buildings.
            playerCar.pos.x += Math.sin(c.heading) * 1.1 * dt * 10;
            playerCar.pos.z += Math.cos(c.heading) * 1.1 * dt * 10;
            collideCircle(playerCar.pos, 1.7, colliders);
          }
        } else if (dist < WANTED.bustRadius) {
          if (onBusted) onBusted();
        }
      }
    }
    return wanted;
  }

  return {
    get wanted() { return wanted; },
    set wanted(v) { wanted = Math.max(0, Math.min(WANTED.maxStars, v)); quietTimer = 0; },
    addCrime,
    placeCruiser,
    update,
    cruisers,
  };
}
