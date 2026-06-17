/**
 * Nganya — game orchestrator.
 * Ties the world, the bus, and the passengers together: the render loop, the
 * three camera modes, role-switching with AI takeover, the driving physics, the
 * conductor autopilot, stage docking, and click-to-bill.
 */
import {
  STAGES, CAM, MAX_SPEED, ACCEL, BRAKE, STEER, DRAG, ROAD_WIDTH,
  OWNER_TARGET, BUS_CAPACITY, START_CASH, START_FUEL, FUEL_DRAIN,
  STAGE_DOCK_RADIUS, ROUTE_NUMBER, SACCO_NAME, SHENG, pick,
} from './data.js';
import { createWorld } from './world.js';
import { createBus } from './bus.js';
import { PassengerManager } from './passengers.js';
import { UI } from './ui.js';

export class Game {
  constructor() {
    this.ui = new UI();
    this.keys = {};
    this.raycaster = new THREE.Raycaster();
    this.cabinYaw = Math.PI / 2;       // conductor look angle (start facing right-side seats)
    this.cabinZ = 0;                   // conductor position along the aisle (local z)
    this.dockedIndex = -1;
    this.aiTarget = 1;                 // autopilot's next stage
    this.dwell = 0;                    // doors-open timer at a stage
    this.aiBillTimer = 0;
    this.running = false;
    this.state = {
      role: 'driver', cam: CAM.CHASE,
      cash: START_CASH, fuel: START_FUEL, target: OWNER_TARGET,
      speed: 0, started: false, dayOver: false,
    };
  }

  init() {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x223044);
    scene.fog = new THREE.Fog(0x223044, 60, 260);
    this.scene = scene;

    const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.1, 2000);
    this.camera = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(innerWidth, innerHeight);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    document.getElementById('app').appendChild(renderer.domElement);
    this.renderer = renderer;

    scene.add(new THREE.HemisphereLight(0xcfe6ff, 0x2a3a22, 0.9));
    const sun = new THREE.DirectionalLight(0xfff3d6, 0.85);
    sun.position.set(40, 80, 20);
    scene.add(sun);

    this.world = createWorld(scene);
    this.bus = createBus();
    this.bus.position.set(0, 0, STAGES[0].z);
    scene.add(this.bus);

    this.pm = new PassengerManager(this.bus);

    this._bindInput();
    this.ui.bind({
      onRole: () => this.switchRole(),
      onCam: () => this.switchCam(),
      onStart: () => this.start(),
      onNewDay: () => this.newDay(),
    });

    this.clock = new THREE.Clock();
    this.running = true;
    this._loop();
  }

  start() {
    this.ui.hideHowto();
    this.state.started = true;
    // board the CBD crowd, then roll
    const r = this.pm.dock(0);
    this.dockedIndex = 0;
    this.aiTarget = 1;
    this.ui.sheng(pick(SHENG.board));
    this.ui.toast(`Railways — ${r.boarded} aboard. Twende Rongai!`);
  }

  // ---------- input ----------
  _bindInput() {
    addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      this.keys[k] = true;
      if (k === 'r') this.switchRole();
      if (k === 'c') this.switchCam();
      if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault();
    });
    addEventListener('keyup', (e) => { this.keys[e.key.toLowerCase()] = false; });
    addEventListener('resize', () => {
      this.camera.aspect = innerWidth / innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(innerWidth, innerHeight);
    });
    // click-to-bill (conductor mode)
    this.renderer.domElement.addEventListener('pointerdown', (e) => this._bill(e));
  }

  _bill(e) {
    if (this.state.role !== 'conductor' || !this.state.started) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );
    this.scene.updateMatrixWorld();
    this.raycaster.setFromCamera(ndc, this.camera);
    const hits = this.raycaster.intersectObjects(this.pm.pickables, false);
    const p = this.pm.pickFromIntersections(hits);
    if (!p) return;
    const res = this.pm.collect(p);
    if (res) {
      this.state.cash += res.fare;
      this.ui.sheng(res.line);
      this.ui.toast(`+ KSh ${res.fare}`);
    }
  }

  // ---------- role & camera ----------
  switchRole() {
    if (!this.state.started) return;
    if (this.state.role === 'driver') {
      this.state.role = 'conductor';
      this.state.cam = CAM.CABIN;
      this.cabinZ = 0; this.cabinYaw = Math.PI / 2;
      this.aiTarget = this._nextStageIndexAhead();   // hand the AI the correct next stop
      this.dwell = 0;
      this.ui.toast('You are the MAKANGA — AI is driving. Click fares.');
      this.ui.hint('Conductor: W/S walk aisle · A/D turn · click a passenger to collect');
    } else {
      this.state.role = 'driver';
      this.state.cam = CAM.CHASE;
      this.ui.toast('You are the DRIVER — AI conducts. Twende!');
      this.ui.hint('Driver: W accelerate · S brake · A/D steer · Space handbrake');
    }
    this.ui.crosshair(this.state.role === 'conductor');
  }

  switchCam() {
    if (this.state.role === 'driver') {
      this.state.cam = this.state.cam === CAM.CHASE ? CAM.COCKPIT : CAM.CHASE;
    } // conductor stays in CABIN
  }

  // ---------- main loop ----------
  _loop() {
    if (!this.running) return;
    requestAnimationFrame(() => this._loop());
    let dt = this.clock.getDelta();
    if (dt > 0.05) dt = 0.05; // clamp after tab-out
    try {
      if (this.state.started && !this.state.dayOver) this._update(dt);
      this._updateCamera();
      this.renderer.render(this.scene, this.camera);
      this._hud();
    } catch (err) {
      console.error('loop error', err);
      this.running = false;
    }
  }

  _update(dt) {
    if (this.state.role === 'driver') this._drive(dt);
    else this._autopilot(dt);

    // fuel burn scales with speed
    this.state.fuel -= FUEL_DRAIN * (1 + Math.abs(this.state.speed)) * dt * 60;
    if (this.state.fuel <= 0) {
      this.state.fuel = 0;
      this.ui.toast('Out of fuel — limping to base');
      this._endTrip(true);
      return;
    }

    // AI conductor trickle while the player drives
    if (this.state.role === 'driver') {
      this.aiBillTimer += dt;
      if (this.aiBillTimer > 1.1) {
        this.aiBillTimer = 0;
        const r = this.pm.aiCollect();
        if (r && r.fare) this.state.cash += r.fare;
      }
    }

    this._wheels(dt);
    this._headlights();
  }

  _drive(dt) {
    const s = this.state;
    if (this.keys['w'] || this.keys['arrowup']) s.speed += ACCEL * dt;
    else if (this.keys['s'] || this.keys['arrowdown']) s.speed -= BRAKE * dt;
    else s.speed -= Math.sign(s.speed) * DRAG * dt;
    if (this.keys[' ']) s.speed -= Math.sign(s.speed) * BRAKE * 1.4 * dt; // handbrake
    s.speed = Math.max(-5, Math.min(MAX_SPEED, s.speed));
    if (Math.abs(s.speed) < 0.02) s.speed = 0;

    // steer = small x nudge within the road
    let x = this.bus.position.x;
    if (this.keys['a'] || this.keys['arrowleft']) x -= STEER * dt * (Math.abs(s.speed) / MAX_SPEED + 0.3) * 4;
    if (this.keys['d'] || this.keys['arrowright']) x += STEER * dt * (Math.abs(s.speed) / MAX_SPEED + 0.3) * 4;
    const lim = ROAD_WIDTH / 2 - 1.6;
    this.bus.position.x = Math.max(-lim, Math.min(lim, x));

    this._advance(s.speed * dt);
    this._tryDock(true);
  }

  _autopilot(dt) {
    const s = this.state;
    const tgt = STAGES[this.aiTarget];
    if (!tgt) return;

    // doors-open dwell at a stage
    if (this.dwell > 0) {
      this.dwell -= dt; s.speed = 0;
      if (this.dwell <= 0) {
        // leave the stage, aim for the next
        this.dockedIndex = -1;
        this.aiTarget = Math.min(this.aiTarget + 1, STAGES.length - 1);
        this.ui.sheng(pick(SHENG.depart));
      }
      return;
    }

    const dist = this.bus.position.z - tgt.z;   // >0 means stage is ahead (more negative)
    const cruise = 10;
    if (dist > STAGE_DOCK_RADIUS) {
      // approach: cruise, then ease down near the stage
      const desired = dist < 40 ? Math.max(2.5, cruise * (dist / 40)) : cruise;
      s.speed += Math.sign(desired - s.speed) * ACCEL * dt;
      s.speed = Math.max(0, Math.min(MAX_SPEED, s.speed));
      // ease back toward the kerb lane
      this.bus.position.x += (-2 - this.bus.position.x) * 0.04;
      this._advance(s.speed * dt);
    } else {
      // arrived — dock
      s.speed = 0;
      const ended = this._dockAt(this.aiTarget);
      if (!ended) this.dwell = 2.6;
    }
  }

  _advance(dz) {
    // outbound is -z; dz is negative when moving forward
    this.bus.position.z += dz;
    // end of the line
    if (this.bus.position.z <= STAGES[STAGES.length - 1].z) {
      this.bus.position.z = STAGES[STAGES.length - 1].z;
      if (this.dockedIndex !== STAGES.length - 1) this._tryDock(false, true);
    }
  }

  _tryDock(playerDriving, forceTerminus = false) {
    // find a stage within docking range while slow
    for (let i = 0; i < STAGES.length; i++) {
      const near = Math.abs(this.bus.position.z - STAGES[i].z) < STAGE_DOCK_RADIUS;
      if (near && Math.abs(this.state.speed) < 2.2) {
        if (this.dockedIndex !== i) this._dockAt(i);
        return;
      }
    }
    if (forceTerminus) return;
    this.dockedIndex = -1; // left all stages
  }

  _dockAt(i) {
    this.dockedIndex = i;
    const stage = STAGES[i];
    const r = this.pm.dock(i);
    if (i === STAGES.length - 1) {
      // reached Rongai — end of trip
      this.ui.sheng(pick(SHENG.arriveTerminus));
      this._endTrip(false);
      return true;
    }
    let msg = `${stage.name}`;
    if (r.alighted) msg += ` — ${r.alighted} ashuka`;
    if (r.boarded) msg += `, ${r.boarded} aboard`;
    this.ui.toast(msg);
    this.ui.sheng(this.pm.isFull ? pick(SHENG.full) : (r.boarded ? pick(SHENG.board) : pick(SHENG.alight)));
    return false;
  }

  _nextStageIndexAhead() {
    let best = -1, bestZ = -Infinity;
    for (let i = 0; i < STAGES.length; i++) {
      if (STAGES[i].z < this.bus.position.z - 1 && STAGES[i].z > bestZ) { bestZ = STAGES[i].z; best = i; }
    }
    return best >= 0 ? best : STAGES.length - 1;
  }

  _endTrip(outOfFuel) {
    // tally and decide: day over (target hit) or loop back to base for another trip
    if (this.state.cash >= this.state.target) {
      this.state.dayOver = true;
      this.ui.showDayOver({ cash: this.state.cash, target: this.state.target, missed: this.pm.missedFares });
      return;
    }
    // back to base (Railways), refuel, reseed, keep cash
    this.ui.toast(outOfFuel ? 'Refueled at base — go again' : 'Trip done — back to base for another round');
    this.bus.position.set(0, 0, STAGES[0].z);
    this.state.speed = 0;
    this.state.fuel = START_FUEL;
    this.pm.reset();
    this.pm.dock(0);
    this.dockedIndex = 0;
    this.aiTarget = 1;
    this.dwell = 0;
  }

  newDay() {
    this.ui.hideDayOver();
    this.state.cash = START_CASH;
    this.state.fuel = START_FUEL;
    this.state.dayOver = false;
    this.state.target = OWNER_TARGET;
    this.state.speed = 0;
    this.bus.position.set(0, 0, STAGES[0].z);
    this.pm.reset();
    this.pm.dock(0);
    this.dockedIndex = 0;
    this.aiTarget = 1;
    this.dwell = 0;
    this.ui.toast('New day — kubeba target reset. Beba beba!');
  }

  _wheels(dt) {
    const spin = this.state.speed * dt * 2.4;
    (this.bus.userData.wheels || []).forEach(w => { w.rotation.x -= spin; });
  }

  _headlights() {
    const on = this.state.speed !== 0 ? 1.1 : 0.4;
    (this.bus.userData.headLights || []).forEach(l => { l.intensity = on; });
  }

  // ---------- cameras ----------
  _updateCamera() {
    const bus = this.bus;
    if (this.state.cam === CAM.CHASE) {
      const off = new THREE.Vector3(0, 6.2, 13);
      off.applyQuaternion(bus.quaternion).add(bus.position);
      this.camera.position.lerp(off, 0.18);
      const look = new THREE.Vector3(0, 1.6, -6).applyQuaternion(bus.quaternion).add(bus.position);
      this.camera.lookAt(look);
    } else if (this.state.cam === CAM.COCKPIT) {
      const a = bus.userData.driverAnchor;
      const pos = new THREE.Vector3(a.x, a.y, a.z).applyQuaternion(bus.quaternion).add(bus.position);
      this.camera.position.copy(pos);
      const look = new THREE.Vector3(a.x, a.y - 0.1, a.z - 10).applyQuaternion(bus.quaternion).add(bus.position);
      this.camera.lookAt(look);
    } else { // CABIN — first-person conductor
      const aisle = bus.userData.aisle;
      // move along the aisle
      const mv = 4 * 0.016;
      if (this.keys['w'] || this.keys['arrowup']) this.cabinZ -= mv;
      if (this.keys['s'] || this.keys['arrowdown']) this.cabinZ += mv;
      this.cabinZ = Math.max(aisle.frontZ, Math.min(aisle.backZ, this.cabinZ));
      // turn
      if (this.keys['a'] || this.keys['arrowleft']) this.cabinYaw += 1.8 * 0.016;
      if (this.keys['d'] || this.keys['arrowright']) this.cabinYaw -= 1.8 * 0.016;

      const pos = new THREE.Vector3(0, aisle.eyeY, this.cabinZ).applyQuaternion(bus.quaternion).add(bus.position);
      this.camera.position.copy(pos);
      const fwdLocal = new THREE.Vector3(Math.sin(this.cabinYaw), -0.18, Math.cos(this.cabinYaw));
      const look = fwdLocal.applyQuaternion(bus.quaternion).add(pos);
      this.camera.lookAt(look);
    }
  }

  _hud() {
    const next = this._nextStageName();
    this.ui.hud({
      cash: this.state.cash, target: this.state.target, fuel: this.state.fuel,
      onboard: this.pm.onboard, capacity: BUS_CAPACITY,
      role: this.state.role, cam: this.state.cam,
      stageNow: this.dockedIndex >= 0 ? STAGES[this.dockedIndex].name : 'en route',
      stageNext: next,
    });
  }

  _nextStageName() {
    let best = null, bestZ = -Infinity;
    for (let i = 0; i < STAGES.length; i++) {
      if (STAGES[i].z < this.bus.position.z - 1 && STAGES[i].z > bestZ) { bestZ = STAGES[i].z; best = STAGES[i]; }
    }
    return best ? best.name : 'Rongai (mwisho)';
  }
}
