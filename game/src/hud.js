// Solmar Heist — the HUD: health, cash, ammo, wanted stars, speed, mission
// objective, toasts, and a live canvas minimap of the whole city.
export function createHud() {
  const el = (id) => document.getElementById(id);
  const hud = el('hud');
  const healthFill = el('healthfill');
  const healthNum = el('healthnum');
  const cashEl = el('cash');
  const ammoEl = el('ammo');
  const wantedEl = el('wanted');
  const missionName = el('missionname');
  const objectiveText = el('objectivetext');
  const speedEl = el('speed');
  const carNameEl = el('carname');
  const toastEl = el('toast');
  const crosshair = el('crosshair');
  const damageEl = el('damage');
  const hintEl = el('hint');
  const map = el('minimap');
  const mctx = map.getContext('2d');
  let toastTimer = null;

  function show(on) { hud.classList.toggle('on', on); }

  function toast(text, ms) {
    toastEl.textContent = text;
    toastEl.classList.add('show');
    if (toastTimer) window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toastEl.classList.remove('show'), ms || 2600);
  }

  function setDamage(amount) {
    damageEl.style.opacity = String(Math.min(1, amount));
    if (amount > 0) window.setTimeout(() => { damageEl.style.opacity = '0'; }, 350);
  }

  function drawMinimap(state) {
    const S = 180;
    const half = 210;
    const toMap = (x, z) => [((x + half) / (half * 2)) * S, ((z + half) / (half * 2)) * S];
    mctx.clearRect(0, 0, S, S);
    // Water + sand + city base.
    mctx.fillStyle = '#1e7fa8';
    mctx.fillRect(0, 0, S, S);
    mctx.fillStyle = '#e8d29a';
    const [sx] = toMap(210, 0);
    mctx.fillRect(sx, 0, S - sx, S);
    mctx.fillStyle = '#8b9490';
    mctx.fillRect(0, 0, sx, S);
    // Roads.
    mctx.strokeStyle = '#3a4048';
    mctx.lineWidth = 5;
    for (let i = -4; i <= 4; i++) {
      const [rx] = toMap(i * 52, 0);
      const [, rz] = toMap(0, i * 52);
      mctx.beginPath(); mctx.moveTo(rx, 0); mctx.lineTo(rx, S); mctx.stroke();
      mctx.beginPath(); mctx.moveTo(0, rz); mctx.lineTo(S, rz); mctx.stroke();
    }
    // Mission target.
    if (state.target) {
      const [tx, tz] = toMap(state.target[0], state.target[2]);
      mctx.fillStyle = '#ffd76a';
      mctx.beginPath(); mctx.arc(tx, tz, 7, 0, Math.PI * 2); mctx.fill();
      mctx.strokeStyle = '#fff';
      mctx.lineWidth = 2;
      mctx.beginPath(); mctx.arc(tx, tz, 7, 0, Math.PI * 2); mctx.stroke();
    }
    // Traffic (white dots), police (blue/red), player (green arrow).
    mctx.fillStyle = '#fff';
    for (const c of state.traffic) {
      const [cx, cz] = toMap(c.pos.x, c.pos.z);
      mctx.fillRect(cx - 1.5, cz - 1.5, 3, 3);
    }
    for (const c of state.police) {
      const [cx, cz] = toMap(c.pos.x, c.pos.z);
      mctx.fillStyle = '#3a86ff';
      mctx.beginPath(); mctx.arc(cx, cz, 3.5, 0, Math.PI * 2); mctx.fill();
      mctx.fillStyle = '#fff';
    }
    if (state.playerCar) {
      const [cx, cz] = toMap(state.playerCar.pos.x, state.playerCar.pos.z);
      mctx.fillStyle = '#ffd76a';
      mctx.beginPath(); mctx.arc(cx, cz, 4, 0, Math.PI * 2); mctx.fill();
    }
    const [px, pz] = toMap(state.player.pos.x, state.player.pos.z);
    mctx.save();
    mctx.translate(px, pz);
    mctx.rotate(-state.heading);
    mctx.fillStyle = '#37d67a';
    mctx.beginPath();
    mctx.moveTo(0, -7); mctx.lineTo(5, 6); mctx.lineTo(-5, 6); mctx.closePath();
    mctx.fill();
    mctx.restore();
  }

  function update(state) {
    healthFill.style.width = `${Math.max(0, state.health)}%`;
    healthFill.style.background = state.health > 50
      ? 'linear-gradient(90deg,#37d67a,#9be15d)'
      : state.health > 25 ? 'linear-gradient(90deg,#f5a623,#ffd76a)' : 'linear-gradient(90deg,#e74c3c,#ff6a5e)';
    healthNum.textContent = String(Math.max(0, Math.round(state.health)));
    cashEl.textContent = `$${state.cash.toLocaleString('en-US')}`;
    ammoEl.textContent = state.pistolDrawn ? `Pistol: ${state.ammo} rounds` : (state.ammo > 0 ? 'Q: draw pistol' : '');
    let stars = '';
    for (let i = 0; i < 5; i++) stars += `<span class="${i < state.wanted ? '' : 'off'}">★</span>`;
    wantedEl.innerHTML = stars;
    missionName.textContent = state.objective.name;
    objectiveText.textContent = state.objective.text;
    const kmh = Math.round(Math.abs(state.speed) * 3.6);
    speedEl.textContent = String(state.playerCar ? kmh : 0);
    carNameEl.textContent = state.playerCar ? state.playerCar.name : (state.pistolDrawn ? 'Pistol drawn — F to shoot' : 'On foot');
    crosshair.style.display = state.pistolDrawn && !state.playerCar ? 'block' : 'none';
    hintEl.style.display = state.playerCar ? 'none' : 'block';
    drawMinimap(state);
  }

  return { show, toast, setDamage, update };
}
