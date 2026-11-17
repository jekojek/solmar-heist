// Solmar Heist — world constants and tuning. One place for every number the
// other modules share, so balance tweaks never mean hunting through gameplay code.
export const WORLD = {
  half: 210,            // city extends -210..210 on X and Z; beach/ocean past +210 X
  block: 40,            // city block size (building plots sit inside blocks)
  road: 12,             // road width between blocks
  blocks: 5,            // blocks per side (streets at multiples of block+road)
  groundY: 0,
};

export const PLAYER = {
  walkSpeed: 7,
  runSpeed: 11,
  radius: 0.55,
  maxHealth: 100,
  punchDamage: 34,
  punchRange: 2.2,
  pistolDamage: 55,
  pistolRange: 60,
  startAmmo: 12,
};

export const CAR = {
  accel: 22,
  brake: 34,
  maxSpeed: 46,         // ~165 km/h
  maxReverse: 12,
  steer: 0.55,          // radians at low speed
  grip: 6.5,
  handbrakeGrip: 1.6,
};

export const WANTED = {
  decaySeconds: 14,     // seconds without a crime before one star drops
  maxStars: 5,
  policePerStar: [0, 1, 2, 2, 3, 4],
  bustRadius: 2.6,      // police on foot range that busts the player
  ramDamage: 9,
};

export const SAVE_KEY = 'solmar-heist-save-v1';

export const CAR_NAMES = ['Viento', 'Marlin GT', 'Solano Cruiser', 'Palmera', 'Coral Runner', 'Tide Coupe'];
export const CAR_COLORS = [0xd83a2e, 0x2e7dd8, 0xf2c230, 0x37b06a, 0x8a5fd0, 0xe8e8e8, 0x222831, 0xff7a2f];

// Story beats: Mira Solano hires Raka, a courier-turned-wheelman, to clear a $50,000 debt.
export const MISSIONS = [
  {
    id: 'first-pickup',
    name: 'JOB 1 — FIRST PICKUP',
    brief: 'Mira: "A package is waiting at the docks, east side. Bring it to my garage. No detours, Raka."',
    steps: [
      { text: 'Drive to the docks pickup', target: [196, 0, -120], radius: 6 },
      { text: 'Take the package to Mira\u2019s garage', target: [-130, 0, 118], radius: 7 },
    ],
    reward: 1500,
  },
  {
    id: 'borrowed-wheels',
    name: 'JOB 2 — BORROWED WHEELS',
    brief: 'Mira: "A client wants a Marlin GT, yellow, parked by the plaza fountain. Borrow it. Bring it to the chop shop."',
    steps: [
      { text: 'Steal the yellow Marlin GT at the plaza', target: [44, 0, 30], radius: 5, needCar: 'Marlin GT' },
      { text: 'Deliver the Marlin GT to the chop shop', target: [-170, 0, -70], radius: 7, needCar: 'Marlin GT' },
    ],
    reward: 2500,
  },
  {
    id: 'hot-delivery',
    name: 'JOB 3 — HOT DELIVERY',
    brief: 'Mira: "Last one. The cops already know the route — deliver the case to the north marina in 100 seconds and the debt is gone."',
    steps: [
      { text: 'Grab the case at the garage, then reach the north marina — fast!', target: [-40, 0, -196], radius: 8, timer: 100, startWanted: 2 },
    ],
    reward: 5000,
  },
];
