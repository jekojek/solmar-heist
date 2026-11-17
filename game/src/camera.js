// Solmar Heist — third-person chase camera. Orbits with the mouse, follows
// behind the player on foot or behind the car while driving, and pulls in
// when a building would block the view.
export function createCamera(camera, dom) {
  let yaw = 0;
  let pitch = 0.32;
  let dist = 9;
  const tmp = new THREE.Vector3();

  function update(dt, target, targetHeading, driving, mouse, colliders) {
    const m = mouse.consumeMouse();
    yaw -= m.dx * 0.0032;
    pitch += m.dy * 0.0022;
    pitch = Math.max(0.08, Math.min(0.9, pitch));
    if (driving) {
      // Ease the camera behind the car's heading; the mouse can still look around.
      let diff = targetHeading - yaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      yaw += diff * Math.min(1, dt * 1.6);
      dist += (11 - dist) * Math.min(1, dt * 3);
    } else {
      dist += (8 - dist) * Math.min(1, dt * 3);
    }
    const eye = new THREE.Vector3(
      target.x - Math.sin(yaw) * Math.cos(pitch) * dist,
      target.y + 1.6 + Math.sin(pitch) * dist,
      target.z - Math.cos(yaw) * Math.cos(pitch) * dist,
    );
    // Pull the camera in if a building stands between eye and target.
    if (colliders) {
      const dir = tmp.copy(eye).sub(target).normalize();
      let best = dist;
      for (const b of colliders) {
        const t = rayHitBox(target, dir, b);
        if (t !== null && t < best) best = Math.max(2.2, t - 0.4);
      }
      if (best < dist) {
        eye.copy(target).addScaledVector(dir, best);
        eye.y = Math.max(eye.y, target.y + 0.8);
      }
    }
    camera.position.copy(eye);
    camera.lookAt(target.x, target.y + (driving ? 1.4 : 1.7), target.z);
  }

  // Slab test: distance along the ray to an axis-aligned box, or null.
  function rayHitBox(origin, dir, b) {
    let tmin = 0;
    let tmax = 1e9;
    const o = [origin.x, origin.y, origin.z];
    const d = [dir.x, dir.y, dir.z];
    const mn = [b.minX, 0, b.minZ];
    const mx = [b.maxX, b.height, b.maxZ];
    for (let i = 0; i < 3; i++) {
      if (Math.abs(d[i]) < 1e-8) {
        if (o[i] < mn[i] || o[i] > mx[i]) return null;
      } else {
        let t1 = (mn[i] - o[i]) / d[i];
        let t2 = (mx[i] - o[i]) / d[i];
        if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
        tmin = Math.max(tmin, t1);
        tmax = Math.min(tmax, t2);
        if (tmin > tmax) return null;
      }
    }
    return tmin;
  }

  return {
    update,
    get yaw() { return yaw; },
    set yaw(v) { yaw = v; },
    snapBehind(heading) { yaw = heading; },
  };
}
