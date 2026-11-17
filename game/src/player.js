// Solmar Heist — Raka on foot: a simple blocky character with swinging limbs,
// WASD movement relative to the camera, and building collision.
import { PLAYER } from './config.js';
import { collideCircle } from './vehicles.js';

export function createPlayerMesh() {
  const g = new THREE.Group();
  const skin = new THREE.MeshLambertMaterial({ color: 0xc98d64 });
  const shirt = new THREE.MeshLambertMaterial({ color: 0x2e7dd8 });
  const pants = new THREE.MeshLambertMaterial({ color: 0x2b2f36 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.75, 0.34), shirt);
  body.position.y = 1.18;
  g.add(body);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.4), skin);
  head.position.y = 1.8;
  g.add(head);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.14, 0.44), new THREE.MeshLambertMaterial({ color: 0xf2c230 }));
  cap.position.y = 2.02;
  g.add(cap);
  const legs = [];
  for (const sx of [-0.16, 0.16]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.8, 0.26), pants);
    leg.position.set(sx, 0.4, 0);
    leg.geometry.translate(0, -0.4, 0);
    leg.position.y = 0.8;
    g.add(leg);
    legs.push(leg);
  }
  const arms = [];
  for (const sx of [-0.4, 0.4]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.7, 0.22), shirt);
    arm.geometry.translate(0, -0.35, 0);
    arm.position.set(sx, 1.5, 0);
    g.add(arm);
    arms.push(arm);
  }
  g.userData.legs = legs;
  g.userData.arms = arms;
  return g;
}

export function createPlayer(scene, colliders) {
  const mesh = createPlayerMesh();
  scene.add(mesh);
  const player = {
    mesh,
    pos: mesh.position,
    heading: 0,
    health: PLAYER.maxHealth,
    ammo: PLAYER.startAmmo,
    pistolDrawn: false,
    speed: 0,
    walkPhase: 0,
    inCar: null,
    punchCooldown: 0,
    shootCooldown: 0,
  };
  player.pos.set(-118, 0, 118);
  mesh.rotation.y = 0;

  function update(dt, input, camYaw) {
    if (player.inCar) return;
    player.punchCooldown = Math.max(0, player.punchCooldown - dt);
    player.shootCooldown = Math.max(0, player.shootCooldown - dt);
    const fwd = (input.forward ? 1 : 0) - (input.back ? 1 : 0);
    const strafe = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const moving = fwd !== 0 || strafe !== 0;
    const targetSpeed = moving ? (input.run ? PLAYER.runSpeed : PLAYER.walkSpeed) : 0;
    player.speed += (targetSpeed - player.speed) * Math.min(1, dt * 10);
    if (player.speed > 0.2) {
      const moveAngle = camYaw + Math.atan2(strafe, fwd);
      // Face the direction of travel.
      let diff = moveAngle - player.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      player.heading += diff * Math.min(1, dt * 12);
      player.pos.x += Math.sin(moveAngle) * player.speed * dt;
      player.pos.z += Math.cos(moveAngle) * player.speed * dt;
      player.walkPhase += dt * player.speed * 1.6;
    }
    collideCircle(player.pos, PLAYER.radius, colliders);
    mesh.position.copy(player.pos);
    mesh.rotation.y = player.heading;
    const swing = Math.sin(player.walkPhase) * Math.min(1, player.speed / PLAYER.walkSpeed) * 0.7;
    mesh.userData.legs[0].rotation.x = swing;
    mesh.userData.legs[1].rotation.x = -swing;
    mesh.userData.arms[0].rotation.x = -swing * 0.8;
    mesh.userData.arms[1].rotation.x = swing * 0.8;
  }

  return { player, update };
}
