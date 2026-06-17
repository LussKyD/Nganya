/**
 * Nganya — game data.
 * One real corridor: Railways (Nairobi CBD) -> Rongai, Route 125.
 * Stages, fares, sheng lines, and tuning constants all live here.
 */

// --- Corridor: ordered CBD -> Rongai. z gets more negative outbound. ---
// fareFromCBD = the matatu fare (KSh) from the CBD to that stage. Grounded in
// real 2026 Ngong Rd / Rongai fares (CBD~Rongai ≈ KSh 100–150).
export const STAGES = [
  { name: 'Railways',         short: 'CBD',      z: 60,    fareFromCBD: 0,   terminus: true  },
  { name: 'Prestige',         short: 'Prestige', z: -120,  fareFromCBD: 30,  terminus: false },
  { name: 'Yaya Centre',      short: 'Yaya',     z: -300,  fareFromCBD: 40,  terminus: false },
  { name: 'Adams Arcade',     short: 'Adams',    z: -480,  fareFromCBD: 50,  terminus: false },
  { name: 'Dagoretti Corner', short: 'Dago',     z: -660,  fareFromCBD: 60,  terminus: false },
  { name: 'Karen / Bomas',    short: 'Karen',    z: -840,  fareFromCBD: 90,  terminus: false },
  { name: 'Rongai',           short: 'Rongai',   z: -1020, fareFromCBD: 120, terminus: true  },
];

export const ROUTE_NUMBER = '125';
export const SACCO_NAME = 'RONGAI EXPRESS';
export const NGANYA_NAME = 'MAMBA';        // the player's matatu (themeable later)

// --- Economy ---
export const OWNER_TARGET = 3000;          // "kubeba" target — owner's daily cut goal
export const BUS_CAPACITY = 14;            // 14-seater Nissan nganya
export const START_CASH = 0;
export const START_FUEL = 100;
export const FUEL_DRAIN = 0.0035;          // per drive tick, scaled by speed
export const MIN_FARE = 20;

// --- Road / world ---
export const ROAD_WIDTH = 16;
export const ROAD_Z_START = 140;           // a little behind Railways
export const ROAD_Z_END = -1120;           // a little past Rongai
export const PULL_OVER_X = ROAD_WIDTH / 2 - 3; // bus hugs the left kerb at a stage
export const STAGE_DOCK_RADIUS = 14;       // within this z-distance + slow = docked

// --- Driving feel (heavy 14-seater) ---
export const MAX_SPEED = 16;               // m/s ≈ 58 km/h
export const ACCEL = 5.5;
export const BRAKE = 11;
export const STEER = 1.8;
export const DRAG = 0.6;

// --- Camera modes ---
export const CAM = { CHASE: 'chase', COCKPIT: 'cockpit', CABIN: 'cabin' };

// --- Sheng / callouts (authentic working language of the makanga) ---
export const SHENG = {
  board:   ['Beba beba! Songa nyuma!', 'Pesa mbele! Beba!', 'Sonko, ingia!'],
  alight:  ['Tushukishe!', 'Shukisha hapo!', 'Mteja ashuke!'],
  collect: ['Sawa, asante!', 'Poa, mteja!', 'Form ni hiyo!'],
  full:    ['Imejaa! Imejaa!', 'Gari imejaa, tukatike!'],
  depart:  ['Twende Rongai!', 'Tukatike, base!'],
  arriveTerminus: ['Mwisho wa safari — Rongai!', 'Base! Kushukeni wote.'],
};

export function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// fare a passenger pays for boarding at i and alighting at j (j>i, outbound)
export function fareBetween(i, j) {
  return Math.max(MIN_FARE, STAGES[j].fareFromCBD - STAGES[i].fareFromCBD);
}
