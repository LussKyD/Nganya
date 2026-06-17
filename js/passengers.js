/**
 * Passengers — the NPC system that makes conductor mode real.
 * Each passenger boards at a stage, has a destination further down the route,
 * a fare owed, a paid/unpaid state, a seat, and a 3D seated figure you can click
 * to bill. They alight automatically at their destination stage.
 */
import { STAGES, BUS_CAPACITY, fareBetween, SHENG, pick } from './data.js';

const CLOTHES = [0xd64545, 0x4a9eff, 0x2ecc8a, 0xe0b548, 0xE8A0C0, 0xff8c42, 0x9b6bff, 0x46c5d6];
const SKIN = [0x6b4226, 0x8d5524, 0x5a3217, 0x7a4a2a];

function makeTag(text, color) {
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d');
  c.width = 256; c.height = 96;
  ctx.fillStyle = 'rgba(10,10,15,0.85)';
  ctx.fillRect(0, 0, 256, 96);
  ctx.strokeStyle = color; ctx.lineWidth = 6; ctx.strokeRect(3, 3, 250, 90);
  ctx.fillStyle = color; ctx.font = 'bold 52px Arial';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, 50);
  const tex = new THREE.CanvasTexture(c);
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false }));
  spr.scale.set(0.9, 0.34, 1);
  spr.userData.canvas = c; spr.userData.ctx = ctx; spr.userData.tex = tex;
  return spr;
}

function setTag(spr, text, color) {
  const ctx = spr.userData.ctx;
  ctx.clearRect(0, 0, 256, 96);
  ctx.fillStyle = 'rgba(10,10,15,0.85)'; ctx.fillRect(0, 0, 256, 96);
  ctx.strokeStyle = color; ctx.lineWidth = 6; ctx.strokeRect(3, 3, 250, 90);
  ctx.fillStyle = color; ctx.font = 'bold 52px Arial';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, 50);
  spr.userData.tex.needsUpdate = true;
}

export class PassengerManager {
  constructor(bus) {
    this.bus = bus;
    this.cabin = bus.userData.cabin;
    this.anchors = bus.userData.seatAnchors;
    this.passengers = [];                 // currently on board
    this.pickables = [];                  // figure meshes for raycasting
    this.freeSeats = this.anchors.map((_, i) => i);
    this.missedFares = 0;
    // waiting passengers per stage (seeded heavier near the CBD)
    this.waiting = STAGES.map((s, i) => {
      if (s.terminus && i === STAGES.length - 1) return 0; // nobody boards at the final terminus outbound
      return Math.max(0, Math.round(4 + Math.random() * 6 - i));
    });
  }

  get onboard() { return this.passengers.length; }
  get unpaid() { return this.passengers.filter(p => !p.paid).length; }
  get isFull() { return this.passengers.length >= BUS_CAPACITY; }

  _makeFigure(p) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.7, 0.4),
      new THREE.MeshLambertMaterial({ color: CLOTHES[Math.floor(Math.random() * CLOTHES.length)] })
    );
    body.position.y = 0.35;
    g.add(body);
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 12, 12),
      new THREE.MeshLambertMaterial({ color: SKIN[Math.floor(Math.random() * SKIN.length)] })
    );
    head.position.y = 0.82;
    g.add(head);
    // clickable hit box (covers body+head)
    const hit = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 1.2, 0.7),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    hit.position.y = 0.5;
    hit.userData.passenger = p;
    g.add(hit);
    this.pickables.push(hit);
    // fare tag above head
    const tag = makeTag(`KSh ${p.fare}`, '#FF5555');
    tag.position.y = 1.4;
    g.add(tag);
    p.tag = tag;
    p.hit = hit;
    const a = this.anchors[p.seat];
    g.position.set(a.x, a.y, a.z);
    p.figure = g;
    this.cabin.add(g);
  }

  /** Dock at a stage: alight anyone bound here, then board waiting passengers. */
  dock(stageIndex) {
    let alighted = 0;
    // alight
    const remaining = [];
    for (const p of this.passengers) {
      if (p.dest === stageIndex) {
        if (!p.paid) this.missedFares += p.fare;   // got off without paying — lost fare
        this._removeFigure(p);
        this.freeSeats.push(p.seat);
        alighted++;
      } else {
        remaining.push(p);
      }
    }
    this.passengers = remaining;

    // board (only from non-final stages, and only outbound destinations exist)
    let boarded = 0;
    if (stageIndex < STAGES.length - 1) {
      let want = this.waiting[stageIndex] || 0;
      while (want > 0 && this.freeSeats.length > 0) {
        const dest = stageIndex + 1 + Math.floor(Math.random() * (STAGES.length - 1 - stageIndex));
        const fare = fareBetween(stageIndex, dest);
        const seat = this.freeSeats.shift();
        const p = { board: stageIndex, dest, fare, paid: false, seat };
        this._makeFigure(p);
        this.passengers.push(p);
        want--; boarded++;
      }
      this.waiting[stageIndex] = want; // leftover keep waiting (bus full)
    }
    return { boarded, alighted };
  }

  _removeFigure(p) {
    if (p.hit) {
      const i = this.pickables.indexOf(p.hit);
      if (i >= 0) this.pickables.splice(i, 1);
    }
    if (p.figure) this.cabin.remove(p.figure);
  }

  /** Bill a specific passenger (player conductor clicking them). */
  collect(p) {
    if (!p || p.paid) return null;
    p.paid = true;
    setTag(p.tag, 'PAID', '#2ECC8A');
    return { fare: p.fare, line: pick(SHENG.collect) };
  }

  /** AI conductor trickle (used while the player is driving). */
  aiCollect() {
    const u = this.passengers.find(p => !p.paid);
    if (!u) return null;
    return Object.assign({ passenger: u }, this.collect(u));
  }

  /** Resolve a click/raycast hit to a passenger. */
  pickFromIntersections(intersects) {
    for (const it of intersects) {
      let o = it.object;
      while (o) {
        if (o.userData && o.userData.passenger) return o.userData.passenger;
        o = o.parent;
      }
    }
    return null;
  }

  reset() {
    for (const p of this.passengers) this._removeFigure(p);
    this.passengers = [];
    this.pickables = [];
    this.freeSeats = this.anchors.map((_, i) => i);
    this.missedFares = 0;
    this.waiting = STAGES.map((s, i) =>
      (s.terminus && i === STAGES.length - 1) ? 0 : Math.max(0, Math.round(4 + Math.random() * 6 - i)));
  }
}
