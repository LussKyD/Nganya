/**
 * The nganya — a 14-seater Nissan matatu, pimped.
 * Exterior (purple body, gold roof, graffiti accent, route plate, SACCO name)
 * plus a walkable interior: floor, 14 seats in 2 columns with a central aisle,
 * a driver anchor, a door anchor, and seat anchors for passengers.
 */
import { makeLabel } from './world.js';
import { ROUTE_NUMBER, SACCO_NAME, NGANYA_NAME, BUS_CAPACITY } from './data.js';

const BODY = 0x7a2fd6;     // nganya purple
const ROOF = 0xC9A84C;     // DRACO gold
const ACCENT = 0xE8A0C0;   // pink accent stripe
const W = 2.6;             // body width
const H = 3.0;             // body height
const LEN = 9;             // body length

export function createBus() {
  const bus = new THREE.Group();

  // ---- Exterior shell ----
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(W, H * 0.72, LEN * 0.8),
    new THREE.MeshLambertMaterial({ color: BODY })
  );
  body.position.y = H * 0.36;
  bus.add(body);

  // window strip
  const win = new THREE.Mesh(
    new THREE.BoxGeometry(W + 0.04, H * 0.3, LEN * 0.74),
    new THREE.MeshBasicMaterial({ color: 0x10243a, transparent: true, opacity: 0.6 })
  );
  win.position.y = H * 0.56;
  bus.add(win);

  // graffiti accent stripe
  const stripe = new THREE.Mesh(
    new THREE.BoxGeometry(W + 0.06, 0.22, LEN * 0.8),
    new THREE.MeshBasicMaterial({ color: ACCENT })
  );
  stripe.position.y = H * 0.3;
  bus.add(stripe);

  // gold roof
  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(W + 0.12, H * 0.1, LEN * 0.84),
    new THREE.MeshLambertMaterial({ color: ROOF })
  );
  roof.position.y = H * 0.74;
  bus.add(roof);

  // cab (front, -z)
  const cab = new THREE.Mesh(
    new THREE.BoxGeometry(W * 0.96, H * 0.55, LEN * 0.2),
    new THREE.MeshLambertMaterial({ color: 0x1f2937 })
  );
  cab.position.set(0, H * 0.3, -LEN * 0.46);
  bus.add(cab);

  // windscreen
  const screen = new THREE.Mesh(
    new THREE.BoxGeometry(W * 0.9, H * 0.34, 0.06),
    new THREE.MeshBasicMaterial({ color: 0x0ea5e9, transparent: true, opacity: 0.5 })
  );
  screen.position.set(0, H * 0.34, -LEN * 0.5);
  bus.add(screen);

  // sliding door (right side, mid)
  const door = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, H * 0.5, 1.3),
    new THREE.MeshLambertMaterial({ color: 0x2b2f3a })
  );
  door.position.set(W / 2 + 0.06, H * 0.28, LEN * 0.05);
  bus.add(door);
  bus.userData.door = door;

  // headlights (meshes + point lights)
  const hlMat = new THREE.MeshBasicMaterial({ color: 0xfff3c4 });
  const hlGeo = new THREE.CylinderGeometry(0.13, 0.13, 0.12, 10);
  const headLights = [];
  [-0.7, 0.7].forEach(x => {
    const hl = new THREE.Mesh(hlGeo, hlMat);
    hl.rotation.x = Math.PI / 2;
    hl.position.set(x, H * 0.12, -LEN / 2 - 0.05);
    bus.add(hl);
    const pl = new THREE.PointLight(0xffeedd, 0, 26);
    pl.position.set(x, H * 0.12, -LEN / 2 - 0.3);
    bus.add(pl);
    headLights.push(pl);
  });
  bus.userData.headLights = headLights;

  // wheels (6)
  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.3, 16);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x141414 });
  const wheels = [];
  [[-1, -LEN/2+1.0], [1, -LEN/2+1.0], [-1, 0], [1, 0], [-1, LEN/2-1.0], [1, LEN/2-1.0]]
    .forEach(([sx, z]) => {
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(sx * (W/2 + 0.15), 0.42, z);
      bus.add(wheel);
      wheels.push(wheel);
    });
  bus.userData.wheels = wheels;

  // ---- Branding ----
  // route number plate on the front
  const plate = makeLabel(ROUTE_NUMBER, { height: 0.7, fontSize: 80, bg: '#0A0A0F', color: '#C9A84C' });
  plate.position.set(0, H * 0.5, -LEN * 0.5 - 0.04);
  bus.add(plate);
  // SACCO + nganya name on the left flank (faces -x so passengers at kerb read it)
  const flank = makeLabel(`${NGANYA_NAME}  ·  ${SACCO_NAME}`, { height: 0.6, fontSize: 52, bg: '#7a2fd6', color: '#ffffff', border: '#C9A84C' });
  flank.position.set(-W / 2 - 0.06, H * 0.42, 0);
  flank.rotation.y = -Math.PI / 2;
  bus.add(flank);

  // ---- Interior (walkable) ----
  const cabin = new THREE.Group();
  cabin.name = 'cabin';
  // floor
  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(W * 0.92, 0.06, LEN * 0.74),
    new THREE.MeshLambertMaterial({ color: 0x20242c, side: THREE.DoubleSide })
  );
  floor.position.set(0, 0.18, LEN * 0.02);
  cabin.add(floor);
  // LED ceiling strip (nganya vibe)
  const led = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 0.05, LEN * 0.7),
    new THREE.MeshBasicMaterial({ color: 0xE8A0C0 })
  );
  led.position.set(0, H * 0.66, LEN * 0.02);
  cabin.add(led);

  // seats: 2 columns (left x=-0.7, right x=+0.7), 7 rows -> 14 seats. Aisle at x=0.
  const seatAnchors = [];
  const seatGeo = new THREE.BoxGeometry(0.7, 0.5, 0.7);
  const seatBackGeo = new THREE.BoxGeometry(0.7, 0.7, 0.12);
  const seatMat = new THREE.MeshLambertMaterial({ color: 0x3a2a4a });
  const rows = BUS_CAPACITY / 2;
  const frontZ = -LEN * 0.28;
  const rowGap = (LEN * 0.62) / (rows - 1);
  for (let r = 0; r < rows; r++) {
    const z = frontZ + r * rowGap;
    [-0.78, 0.78].forEach((x) => {
      const seat = new THREE.Mesh(seatGeo, seatMat);
      seat.position.set(x, 0.5, z);
      cabin.add(seat);
      const back = new THREE.Mesh(seatBackGeo, seatMat);
      back.position.set(x, 0.85, z - 0.3);
      cabin.add(back);
      // anchor where a seated passenger sits
      seatAnchors.push({ x, y: 0.7, z });
    });
  }
  bus.add(cabin);
  bus.userData.cabin = cabin;
  bus.userData.seatAnchors = seatAnchors;          // 14 local positions
  bus.userData.driverAnchor = { x: -0.6, y: 1.2, z: -LEN * 0.4 };
  bus.userData.aisle = { x: 0, frontZ: -LEN * 0.34, backZ: LEN * 0.34, eyeY: 1.45 };

  return bus;
}
