/**
 * UI — all DOM: the HUD, the sheng callout banner, transient toasts,
 * the conductor crosshair, and the start / day-over overlays.
 */
export class UI {
  constructor() {
    const $ = (id) => document.getElementById(id);
    this.el = {
      cash: $('cash'), target: $('target'), fuel: $('fuelFill'),
      onboard: $('onboard'), role: $('role'), cam: $('cam'),
      stageNow: $('stageNow'), stageNext: $('stageNext'),
      sheng: $('sheng'), toast: $('toast'), cross: $('crosshair'),
      btnRole: $('btnRole'), btnCam: $('btnCam'),
      howto: $('howto'), btnStart: $('btnStart'),
      dayover: $('dayover'), doStats: $('doStats'), btnNewDay: $('btnNewDay'),
      hint: $('hint'),
    };
    this._shengT = null; this._toastT = null;
  }

  hud(s) {
    this.el.cash.textContent = `KSh ${Math.round(s.cash).toLocaleString()}`;
    this.el.target.textContent = `/ ${s.target.toLocaleString()}`;
    this.el.fuel.style.width = `${Math.max(0, Math.min(100, s.fuel))}%`;
    this.el.fuel.style.background = s.fuel < 20 ? '#FF5555' : (s.fuel < 45 ? '#E0B548' : '#2ECC8A');
    this.el.onboard.textContent = `${s.onboard}/${s.capacity}`;
    this.el.role.textContent = s.role === 'driver' ? 'DRIVER' : 'CONDUCTOR';
    this.el.role.className = 'val ' + (s.role === 'driver' ? 'gold' : 'pink');
    this.el.cam.textContent = s.cam.toUpperCase();
    this.el.stageNow.textContent = s.stageNow;
    this.el.stageNext.textContent = s.stageNext;
  }

  sheng(line) {
    const e = this.el.sheng;
    e.textContent = line;
    e.classList.add('show');
    clearTimeout(this._shengT);
    this._shengT = setTimeout(() => e.classList.remove('show'), 2200);
  }

  toast(msg) {
    const e = this.el.toast;
    e.textContent = msg;
    e.classList.add('show');
    clearTimeout(this._toastT);
    this._toastT = setTimeout(() => e.classList.remove('show'), 1800);
  }

  crosshair(on) { this.el.cross.style.display = on ? 'block' : 'none'; }
  hint(text) { this.el.hint.textContent = text; }

  hideHowto() { this.el.howto.style.display = 'none'; }

  showDayOver(stats) {
    this.el.doStats.innerHTML =
      `<div><b>KSh ${Math.round(stats.cash).toLocaleString()}</b> collected</div>` +
      `<div>Owner target: KSh ${stats.target.toLocaleString()} — ` +
      `<span style="color:${stats.cash >= stats.target ? '#2ECC8A' : '#FF5555'}">` +
      `${stats.cash >= stats.target ? 'HIT ✓' : 'missed'}</span></div>` +
      `<div style="color:#8A8A9A;margin-top:6px">Missed fares: KSh ${Math.round(stats.missed).toLocaleString()}</div>`;
    this.el.dayover.style.display = 'flex';
  }
  hideDayOver() { this.el.dayover.style.display = 'none'; }

  bind({ onRole, onCam, onStart, onNewDay }) {
    this.el.btnRole.onclick = onRole;
    this.el.btnCam.onclick = onCam;
    this.el.btnStart.onclick = onStart;
    this.el.btnNewDay.onclick = onNewDay;
  }
}
