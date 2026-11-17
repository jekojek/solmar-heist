// Solmar Heist — combat on foot: a punch for close work and a pistol with
// limited ammo. Shots raycast from the camera; peds go down, police cruisers
// take damage, and every assault is a crime the wanted system hears about.
import { PLAYER } from './config.js';

export function createCombat(scene) {
  const raycaster = new THREE.Raycaster();
  const tracerMat = new THREE.MeshBasicMaterial({ color: 0xffe9a8 });
  let tracer = null;
  let tracerLife = 0;

  function punch(player, peds, police, onCrime, onHit) {
    if (player.punchCooldown > 0 || player.inCar) return false;
    player.punchCooldown = 0.45;
    const px = player.pos.x;
    const pz = player.pos.z;
    const fx = Math.sin(player.heading);
    const fz = Math.cos(player.heading);
    let hitAny = false;
    for (const p of peds.peds) {
      if (p.down > 0) continue;
      const dx = p.pos.x - px;
      const dz = p.pos.z - pz;
      const d = Math.hypot(dx, dz);
      if (d < PLAYER.punchRange && (dx * fx + dz * fz) / Math.max(d, 0.01) > 0.2) {
        p.health -= PLAYER.punchDamage;
        p.pos.x += fx * 1.2;
        p.pos.z += fz * 1.2;
        if (p.health <= 0) {
          p.down = 3;
          if (onHit) onHit('ped');
        }
        hitAny = true;
      }
    }
    // Punching a cruiser's window hurts Raka's hand more than the car; skip it.
    void police;
    if (hitAny && onCrime) onCrime(1);
    return hitAny;
  }

  function shoot(player, camera, peds, police, onCrime, onHit) {
    if (player.shootCooldown > 0 || player.inCar) return false;
    if (!player.pistolDrawn) return false;
    if (player.ammo <= 0) return 'empty';
    player.shootCooldown = 0.32;
    player.ammo -= 1;
    raycaster.setFromCamera({ x: 0, y: 0 }, camera);
    raycaster.far = PLAYER.pistolRange;
    const targets = [];
    for (const p of peds.peds) {
      if (p.down <= 0) targets.push(p.mesh);
    }
    for (const c of police.cruisers) targets.push(c.mesh);
    const hits = raycaster.intersectObjects(targets, true);
    // Muzzle tracer: a thin stretched box from the player toward the hit point.
    const from = new THREE.Vector3(player.pos.x, 1.5, player.pos.z);
    let to = from.clone().add(new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).multiplyScalar(40));
    if (hits.length) to = hits[0].point.clone();
    if (tracer) scene.remove(tracer);
    const len = from.distanceTo(to);
    tracer = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, len), tracerMat);
    tracer.position.copy(from).lerp(to, 0.5);
    tracer.lookAt(to);
    scene.add(tracer);
    tracerLife = 0.09;
    if (hits.length) {
      let obj = hits[0].object;
      while (obj && !obj.userData.pedRef) obj = obj.parent;
      const ped = obj ? obj.userData.pedRef : null;
      if (ped) {
        ped.health -= PLAYER.pistolDamage;
        if (ped.health <= 0) {
          ped.down = 4;
          if (onHit) onHit('ped');
        }
      } else {
        // Hit a police cruiser: the department notices.
        if (onHit) onHit('police');
      }
      if (onCrime) onCrime(1);
      return true;
    }
    if (onCrime) onCrime(1);
    return true;
  }

  function update(dt) {
    if (tracer && tracerLife > 0) {
      tracerLife -= dt;
      if (tracerLife <= 0) {
        scene.remove(tracer);
        tracer = null;
      }
    }
  }

  return { punch, shoot, update };
}
