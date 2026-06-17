/**
 * World — the Ngong Rd / Rongai corridor environment.
 * Road, kerbs, lane markings, stage shelters with readable name signs, skyline.
 * THREE is the global from index.html (r128).
 */
import { STAGES, ROAD_WIDTH, ROAD_Z_START, ROAD_Z_END, PULL_OVER_X } from './data.js';

const ROAD_LEN = ROAD_Z_START - ROAD_Z_END;
const ROAD_MID = (ROAD_Z_START + ROAD_Z_END) / 2;

/** Make a readable text label as a plane with a canvas texture. */
export function makeLabel(text, opts = {}) {
  const pad = 24;
  const fontSize = opts.fontSize || 64;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.font = `bold ${fontSize}px Arial`;
  const w = Math.ceil(ctx.measureText(text).width) + pad * 2;
  const h = fontSize + pad * 2;
  canvas.width = w; canvas.height = h;
  ctx.fillStyle = opts.bg || '#0A0A0F';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = opts.border || '#C9A84C';
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, w - 8, h - 8);
  ctx.font = `bold ${fontSize}px Arial`;
  ctx.fillStyle = opts.color || '#F0EDE8';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.fillText(text, w / 2, h / 2 + 4);
  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 4;
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
  const scale = (opts.height || 1.4);
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(scale * (w / h), scale), mat);
  return plane;
}

function buildStageShelter(stage) {
  const g = new THREE.Group();
  // roof canopy
  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(4.4, 0.18, 2.6),
    new THREE.MeshLambertMaterial({ color: 0x2563eb })
  );
  roof.position.y = 2.6;
  g.add(roof);
  // poles
  const poleMat = new THREE.MeshLambertMaterial({ color: 0x374151 });
  [-1.7, 1.7].forEach(x => {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 2.7, 8), poleMat);
    pole.position.set(x, 1.35, 0);
    g.add(pole);
  });
  // bench
  const bench = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.14, 0.5), new THREE.MeshLambertMaterial({ color: 0x8b4513 }));
  bench.position.set(0, 0.5, -0.5);
  g.add(bench);
  // name sign (faces the road, i.e. toward -x where the bus passes on its left)
  const label = makeLabel(stage.name, { height: 1.0, fontSize: 56 });
  label.position.set(0, 3.3, 0);
  g.add(label);
  // place the shelter just outside the left kerb
  g.position.set(PULL_OVER_X + 4, 0, stage.z);
  return g;
}

export function createWorld(scene) {
  // grass terrain
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(900, 2400),
    new THREE.MeshLambertMaterial({ color: 0x3a6b2f })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, -0.05, ROAD_MID);
  scene.add(ground);

  // asphalt
  const road = new THREE.Mesh(
    new THREE.PlaneGeometry(ROAD_WIDTH, ROAD_LEN + 60),
    new THREE.MeshLambertMaterial({ color: 0x2c2c30 })
  );
  road.rotation.x = -Math.PI / 2;
  road.position.set(0, 0, ROAD_MID);
  scene.add(road);

  // dashed centre line
  const dashMat = new THREE.MeshBasicMaterial({ color: 0xf3e9c0 });
  for (let z = ROAD_Z_START; z > ROAD_Z_END; z -= 7) {
    const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 3), dashMat);
    dash.rotation.x = -Math.PI / 2;
    dash.position.set(0, 0.01, z);
    scene.add(dash);
  }
  // solid edge lines + kerbs
  const edgeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const kerbMat = new THREE.MeshLambertMaterial({ color: 0x4a4a4a });
  [-1, 1].forEach(s => {
    const edge = new THREE.Mesh(new THREE.PlaneGeometry(0.2, ROAD_LEN + 60), edgeMat);
    edge.rotation.x = -Math.PI / 2;
    edge.position.set(s * (ROAD_WIDTH / 2 - 0.4), 0.01, ROAD_MID);
    scene.add(edge);
    const kerb = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.18, ROAD_LEN + 60), kerbMat);
    kerb.position.set(s * (ROAD_WIDTH / 2 + 0.2), 0.09, ROAD_MID);
    scene.add(kerb);
  });

  // stage shelters
  STAGES.forEach(st => scene.add(buildStageShelter(st)));

  // simple skyline silhouettes on both sides (Nairobi-ish blocks), no cost
  const blockMat = [0x3b3b46, 0x44454f, 0x33343c].map(c => new THREE.MeshLambertMaterial({ color: c }));
  for (let i = 0; i < 60; i++) {
    const side = i % 2 ? 1 : -1;
    const h = 6 + Math.random() * 34;
    const w = 6 + Math.random() * 8;
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), blockMat[i % 3]);
    const x = side * (ROAD_WIDTH / 2 + 16 + Math.random() * 60);
    const z = ROAD_Z_START - Math.random() * (ROAD_LEN + 40);
    b.position.set(x, h / 2, z);
    scene.add(b);
  }

  return { roadMid: ROAD_MID, roadLen: ROAD_LEN };
}
