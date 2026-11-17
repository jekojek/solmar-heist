// Solmar Heist — builds Solmar Bay itself: the street grid, towers with lit
// windows, the beach and ocean, palms, docks, marina and mission landmarks.
// Everything is procedural geometry + canvas textures, so the game ships no
// image files. Exports the building colliders and the road network.
import { WORLD } from './config.js';

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function facadeTexture(base, lit) {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = base;
  g.fillRect(0, 0, 128, 256);
  for (let y = 10; y < 246; y += 22) {
    for (let x = 10; x < 118; x += 20) {
      const on = Math.random() < 0.35;
      g.fillStyle = on ? lit : 'rgba(20,30,44,0.85)';
      g.fillRect(x, y, 12, 14);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function roadTexture() {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#2c313a';
  g.fillRect(0, 0, 64, 128);
  g.fillStyle = '#f5d76a';
  g.fillRect(30, 8, 4, 44);
  g.fillRect(30, 72, 4, 44);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function buildCity(scene) {
  const rand = mulberry32(20261117);
  const colliders = [];
  const group = new THREE.Group();
  scene.add(group);

  const sun = new THREE.DirectionalLight(0xfff1d6, 1.25);
  sun.position.set(120, 180, 60);
  scene.add(sun);
  scene.add(new THREE.HemisphereLight(0x9fd8ff, 0x3d5a3a, 0.85));
  scene.fog = new THREE.Fog(0xbfd9e8, 260, 620);
  scene.background = new THREE.Color(0x87bfe8);

  // Ground: pale concrete for the city grid.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD.half * 2 + 60, WORLD.half * 2 + 60),
    new THREE.MeshLambertMaterial({ color: 0x9aa3a0 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(30, 0, 0);
  group.add(ground);

  // Beach sand + ocean to the east.
  const sand = new THREE.Mesh(
    new THREE.PlaneGeometry(70, WORLD.half * 2 + 60),
    new THREE.MeshLambertMaterial({ color: 0xe8d29a }),
  );
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(WORLD.half + 35, 0.02, 0);
  group.add(sand);
  const ocean = new THREE.Mesh(
    new THREE.PlaneGeometry(420, WORLD.half * 2 + 400),
    new THREE.MeshLambertMaterial({ color: 0x1e7fa8 }),
  );
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.set(WORLD.half + 250, -0.25, 0);
  group.add(ocean);

  // Roads: dark strips with dashed centrelines along every street.
  const roadTex = roadTexture();
  const streetLines = [];
  const pitch = WORLD.block + WORLD.road;
  for (let i = -4; i <= 4; i++) streetLines.push(i * pitch);
  for (const s of streetLines) {
    for (const horizontal of [true, false]) {
      const len = WORLD.half * 2 + 24;
      const tex = roadTex.clone();
      tex.needsUpdate = true;
      tex.repeat.set(1, len / 26);
      const mat = new THREE.MeshLambertMaterial({ map: tex });
      const road = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.road, len), mat);
      road.rotation.x = -Math.PI / 2;
      if (horizontal) { road.rotation.z = Math.PI / 2; road.position.set(0, 0.03, s); }
      else road.position.set(s, 0.03, 0);
      group.add(road);
    }
  }

  // Buildings: 1–3 towers per block, facades with lit windows.
  const facades = [
    facadeTexture('#c98f5f', '#ffe9a8'),
    facadeTexture('#7fa3b8', '#ffe9a8'),
    facadeTexture('#b8b0a0', '#fff3c4'),
    facadeTexture('#8a9a7b', '#ffe9a8'),
    facadeTexture('#a86a72', '#ffe9a8'),
  ];
  const roofMat = new THREE.MeshLambertMaterial({ color: 0x4a4f55 });
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  for (let bx = -4; bx < 4; bx++) {
    for (let bz = -4; bz < 4; bz++) {
      const cx = bx * pitch + pitch / 2;
      const cz = bz * pitch + pitch / 2;
      // Keep the plaza block open (fountain + parked target car live there).
      if (bx === 0 && bz === 0) continue;
      const count = 1 + Math.floor(rand() * 3);
      for (let k = 0; k < count; k++) {
        const w = 12 + rand() * 14;
        const d = 12 + rand() * 14;
        const h = 10 + rand() * rand() * 46;
        const x = cx + (rand() - 0.5) * (WORLD.block - w - 4);
        const z = cz + (rand() - 0.5) * (WORLD.block - d - 4);
        const mat = new THREE.MeshLambertMaterial({ map: facades[Math.floor(rand() * facades.length)] });
        const b = new THREE.Mesh(boxGeo, mat);
        b.scale.set(w, h, d);
        b.position.set(x, h / 2, z);
        group.add(b);
        const roof = new THREE.Mesh(boxGeo, roofMat);
        roof.scale.set(w + 0.6, 0.8, d + 0.6);
        roof.position.set(x, h + 0.4, z);
        group.add(roof);
        // Rooftop box (AC unit / water tank) for skyline variety.
        if (rand() < 0.5) {
          const tank = new THREE.Mesh(boxGeo, roofMat);
          tank.scale.set(3, 2.4, 3);
          tank.position.set(x + (rand() - 0.5) * w * 0.4, h + 2, z + (rand() - 0.5) * d * 0.4);
          group.add(tank);
        }
        colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2, height: h });
      }
    }
  }

  // Palm trees along the beach and the main boulevard.
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x7a5a38 });
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x2f9e4f });
  function palm(x, z) {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, 7, 6), trunkMat);
    trunk.position.y = 3.5;
    trunk.rotation.z = (rand() - 0.5) * 0.2;
    g.add(trunk);
    for (let i = 0; i < 6; i++) {
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.9, 4.4, 4), leafMat);
      const a = (i / 6) * Math.PI * 2;
      leaf.position.set(Math.cos(a) * 1.4, 7.2, Math.sin(a) * 1.4);
      leaf.rotation.set(Math.sin(a) * 1.1, 0, -Math.cos(a) * 1.1);
      g.add(leaf);
    }
    g.position.set(x, 0, z);
    group.add(g);
  }
  for (let z = -200; z <= 200; z += 26) palm(WORLD.half + 12 + rand() * 20, z + rand() * 8);
  for (let x = -180; x <= 180; x += 52) { palm(x + 8, 58); palm(x - 8, -58); }

  // Street lamps along the main avenue.
  const poleMat = new THREE.MeshLambertMaterial({ color: 0x2b2f36 });
  const lampHeadMat = new THREE.MeshLambertMaterial({ color: 0xfff2b0, emissive: 0xaa8833 });
  for (let x = -180; x <= 180; x += 52) {
    for (const z of [6, -6]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 6, 6), poleMat);
      pole.position.set(x, 3, z);
      group.add(pole);
      const head = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.25, 0.4), lampHeadMat);
      head.position.set(x, 6.1, z);
      group.add(head);
    }
  }

  // --- Landmarks (mission places), each a small readable cluster. ---
  function signBox(x, z, w, h, color, y) {
    const s = new THREE.Mesh(boxGeo, new THREE.MeshLambertMaterial({ color, emissive: color, emissiveIntensity: 0.35 }));
    s.scale.set(w, h, 0.6);
    s.position.set(x, y || 7, z);
    group.add(s);
    return s;
  }
  function flatBuilding(x, z, w, h, d, color) {
    const b = new THREE.Mesh(boxGeo, new THREE.MeshLambertMaterial({ color }));
    b.scale.set(w, h, d);
    b.position.set(x, h / 2, z);
    group.add(b);
    colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2, height: h });
    return b;
  }

  // Docks (east, x≈196, z≈-120): stacked containers + a crane.
  const containerColors = [0xc0392b, 0x2471a3, 0x229954, 0xd4ac0d];
  for (let i = 0; i < 8; i++) {
    const c = new THREE.Mesh(boxGeo, new THREE.MeshLambertMaterial({ color: containerColors[i % 4] }));
    c.scale.set(12, 2.6, 2.6);
    c.position.set(196 + (i % 2) * 4, 1.3 + Math.floor(i / 2) % 2 * 2.7, -140 + (i % 4) * 14);
    c.rotation.y = i % 2 ? 0.06 : -0.04;
    group.add(c);
    colliders.push({ minX: c.position.x - 6, maxX: c.position.x + 6, minZ: c.position.z - 1.4, maxZ: c.position.z + 1.4, height: 5.4 });
  }
  const crane = new THREE.Group();
  const craneMat = new THREE.MeshLambertMaterial({ color: 0xe67e22 });
  const mast = new THREE.Mesh(boxGeo, craneMat);
  mast.scale.set(2, 26, 2); mast.position.y = 13;
  const jib = new THREE.Mesh(boxGeo, craneMat);
  jib.scale.set(22, 1.6, 1.6); jib.position.set(6, 25, 0);
  crane.add(mast, jib);
  crane.position.set(190, 0, -108);
  group.add(crane);
  colliders.push({ minX: 188, maxX: 192, minZ: -110, maxZ: -106, height: 26 });

  // Mira's garage (south-west): low yellow-fronted workshop.
  flatBuilding(-130, 130, 26, 8, 18, 0xd8c25a);
  signBox(-130, 120.6, 18, 2.2, 0xffd76a, 8.5);
  // Chop shop (west): dark warehouse.
  flatBuilding(-182, -78, 24, 9, 16, 0x3a3f47);
  signBox(-182, -69.6, 14, 2, 0xff5a4e, 9.5);
  // North marina pier + boats.
  const pier = new THREE.Mesh(boxGeo, new THREE.MeshLambertMaterial({ color: 0x8a6f4d }));
  pier.scale.set(10, 1, 40);
  pier.position.set(-40, 0.5, -196);
  group.add(pier);
  for (let i = 0; i < 3; i++) {
    const boat = new THREE.Group();
    const hull = new THREE.Mesh(boxGeo, new THREE.MeshLambertMaterial({ color: [0xffffff, 0x2471a3, 0xc0392b][i] }));
    hull.scale.set(3, 1.4, 9);
    hull.position.y = 0.6;
    const cabin = new THREE.Mesh(boxGeo, new THREE.MeshLambertMaterial({ color: 0xeaf2f8 }));
    cabin.scale.set(2.2, 1.4, 3);
    cabin.position.y = 1.8;
    boat.add(hull, cabin);
    boat.position.set(-52 + i * 12, 0, -196);
    boat.rotation.y = (rand() - 0.5) * 0.3;
    group.add(boat);
  }
  // Plaza fountain (city centre, open block).
  const basin = new THREE.Mesh(new THREE.CylinderGeometry(7, 7.5, 1.2, 20), new THREE.MeshLambertMaterial({ color: 0xcfd8dc }));
  basin.position.set(30, 0.6, 30);
  group.add(basin);
  const water = new THREE.Mesh(new THREE.CylinderGeometry(6.2, 6.2, 0.4, 20), new THREE.MeshLambertMaterial({ color: 0x2fa8d8 }));
  water.position.set(30, 1.2, 30);
  group.add(water);
  const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 1, 3.4, 8), new THREE.MeshLambertMaterial({ color: 0x9aa3a0 }));
  spout.position.set(30, 2.6, 30);
  group.add(spout);
  colliders.push({ minX: 22, maxX: 38, minZ: 22, maxZ: 38, height: 3 });
  // Hospital (St. Marina): white block with a red cross slab.
  flatBuilding(130, 130, 30, 16, 20, 0xf2f4f4);
  signBox(130, 119.6, 6, 6, 0xe74c3c, 14);

  return { colliders, streetLines, group };
}
