/* Urasicous Clean Tech — simulated Rampur Kheda microgrid.
   One-minute physics steps; every figure on screen is read from the same state object.
   The simulated day starts at the visitor's clock time, so the home page and the dashboard agree. */
(function () {
  "use strict";

  // ---------- constants (from the project report) ----------
  const ARRAY_KWP = 40;
  const SYS_EFF = 0.82;
  const BATT_KWH = 90;
  const SOC_MIN = 0.2;          // reserve floor
  const SOC_EXPORT = 0.9;       // export surplus above this when the grid is up
  const MAX_CHARGE_KW = 45;     // 0.5C
  const RT_EFF = 0.92;
  const EXPORT_RATE = 3.10;     // ₹ per kWh exported
  const PREPAID_RATE = 5.0;     // ₹ per kWh drawn by a home
  const COMMUNITY = 0.2;        // street lights, water pump
  const CUTS = [[14, 18], [21, 23]];
  const NOW = new Date();
  const START_MIN = NOW.getHours() * 60 + NOW.getMinutes();
  const TODAY = Math.floor((NOW - NOW.getTimezoneOffset() * 60000) / 86400000); // local day number, picks the weather
  const TOPUP_KW = 6;           // forecast mode: gentle grid top-up toward the planned reserve
  // sunshine for each day as a share of a clear day (a monsoon week); the forecast mode reads tomorrow's
  const WEATHER = [0.95, 0.35, 0.85, 0.5, 1.0, 0.7];
  const sunOn = d => WEATHER[d % WEATHER.length];

  // ---------- seeded random ----------
  let seed = 20261024;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);

  // ---------- load profiles: kW drawn by hour, from the five-household survey ----------
  const on = (h, a, b) => (a <= b ? h >= a && h < b : h >= a || h < b);
  const PROFILES = {
    farming: { label: "Farming family", kw: h => (on(h, 7, 9) ? 0.75 : 0) + (on(h, 18, 22) ? 0.045 : 0) + (on(h, 10, 19) ? 0.075 : 0) + 0.012 + (on(h, 20, 22) ? 0.01 : 0) },
    shop:    { label: "Shop owners",    kw: h => 0.15 + (on(h, 17, 22) ? 0.08 : 0) + (on(h, 10, 19) ? 0.075 : 0) + (on(h, 19, 21) ? 0.1 : 0) },
    dairy:   { label: "Dairy farmers",  kw: h => (on(h, 5, 7) || on(h, 17, 19) ? 0.5 : 0) + (on(h, 18, 22) ? 0.03 : 0) + (on(h, 10, 19) ? 0.075 : 0) + 0.012 + (on(h, 6, 7) ? 0.75 : 0) },
    mill:    { label: "Flour mill",     kw: h => (on(h, 9, 12) ? 1.5 : 0) + (on(h, 18, 22) ? 0.045 : 0) + (on(h, 10, 19) ? 0.075 : 0) + 0.012 + (on(h, 20, 23) ? 0.01 : 0) },
    labour:  { label: "Daily-wage family", kw: h => (on(h, 18, 22) ? 0.03 : 0) + (on(h, 10, 19) ? 0.075 : 0) + 0.012 + (on(h, 20, 22) ? 0.01 : 0) }
  };
  const MIX = [].concat(Array(16).fill("farming"), Array(6).fill("shop"), Array(8).fill("dairy"), Array(2).fill("mill"), Array(18).fill("labour"));
  for (let i = MIX.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [MIX[i], MIX[j]] = [MIX[j], MIX[i]]; }

  const houses = MIX.map((type, i) => ({
    id: i + 1,
    type,
    scale: 0.8 + rnd() * 0.4,
    phase: rnd() * 6.28,
    balance: Math.round(180 + rnd() * 900),
    kw: 0,
    kwhToday: 0
  }));
  houses[16].balance = 46; houses[37].balance = 31; // two homes running low

  // ---------- state ----------
  const S = {
    min: 0, day: TODAY, soc: 0.7, solarKw: 0, loadKw: 0, battKw: 0, gridKw: 0,
    genToday: 0, expToday: 0, impToday: 0, earn: 0,
    curveSolar: new Array(24 * 4).fill(null), curveLoad: new Array(24 * 4).fill(null),
    selected: 17, speed: document.querySelector(".seg") ? 60 : 1, ai: false
  };
  let cloud = sunOn(TODAY), cloudTarget = cloud;

  const gridUp = m => !CUTS.some(([a, b]) => m >= a * 60 && m < b * 60);
  const community = (h, homes) => Math.max(homes * COMMUNITY * 0.4, (on(h, 18, 6) ? 1.8 : 0) + (on(h, 6, 8) ? 3.0 : 0));

  function clearSky(m) {
    const h = m / 60;
    if (h < 6.25 || h > 18.75) return 0;
    const s = Math.sin(Math.PI * (h - 6.25) / 12.5);
    return ARRAY_KWP * SYS_EFF * Math.pow(s, 1.25);
  }
  const forecastSolar = (m, d) => clearSky(m) * sunOn(d) * 0.86;

  // expected village load for each hour, used by the forecast and the projection
  const EXP_LOAD = Array.from({ length: 24 }, (_, h) => {
    const homes = houses.reduce((s, hs) => s + PROFILES[hs.type].kw(h) * hs.scale, 0);
    return homes + community(h, homes);
  });

  // Forecast mode looks 24 h ahead and keeps enough charge to carry the village through every cut in that window.
  function reserveFor(day, m) {
    let need = 0;
    for (let k = 0; k < 24; k++) {
      const t = m + k * 60, d = day + Math.floor(t / 1440), mm = t % 1440;
      if (!gridUp(mm)) need += Math.max(0, EXP_LOAD[Math.floor(mm / 60)] - forecastSolar(mm, d));
    }
    return Math.min(0.95, SOC_MIN + need * 1.1 / BATT_KWH);
  }
  const plan = (ai, day, m) => ai
    ? { floor: reserveFor(day, m), exportAt: sunOn(day + 1) < 0.6 ? 1 : SOC_EXPORT, topUp: true }
    : { floor: SOC_MIN, exportAt: SOC_EXPORT, topUp: false };

  // one minute of dispatch; pure, so the projection can reuse it
  function dispatch(m, soc, solar, load, p) {
    const up = gridUp(m), stored = soc * BATT_KWH;
    let net = solar - load, batt = 0, grid = 0;
    if (net >= 0) {
      const room = (up ? p.exportAt : 1) * BATT_KWH - stored;
      const charge = Math.max(0, Math.min(net, MAX_CHARGE_KW, room * 60 / RT_EFF));
      batt = charge; net -= charge;
      if (up) grid = -net; // export the rest
    } else {
      const floor = up ? p.floor : SOC_MIN; // during a cut, everything above the hard floor is available
      const draw = Math.min(-net, Math.max(0, (stored - floor * BATT_KWH) * 60), MAX_CHARGE_KW);
      batt = -draw; net += draw;
      if (net < 0 && up) grid = -net; // import the shortfall
    }
    if (up && p.topUp && batt <= 0 && stored < p.floor * BATT_KWH) {
      const top = Math.min(TOPUP_KW, (p.floor * BATT_KWH - stored) * 60 / RT_EFF);
      batt += top; grid += top;
    }
    const next = (stored + (batt > 0 ? batt * RT_EFF : batt) / 60) / BATT_KWH;
    return { up, batt, grid, soc: Math.min(1, Math.max(0, next)) };
  }

  function step() {
    const m = S.min, h = Math.floor(m / 60);
    if (rnd() < 0.02) cloudTarget = sunOn(S.day) * (0.72 + rnd() * 0.28);
    cloud += (cloudTarget - cloud) * 0.08;

    // household draw
    let homes = 0;
    for (const hs of houses) {
      const base = PROFILES[hs.type].kw(h) * hs.scale;
      const jitter = 1 + 0.08 * Math.sin(m / 9 + hs.phase);
      hs.kw = hs.balance > 0 ? Math.max(0, base * jitter) : 0;
      const kwh = hs.kw / 60;
      hs.kwhToday += kwh;
      hs.balance = Math.max(0, hs.balance - kwh * PREPAID_RATE);
      homes += hs.kw;
    }
    const load = homes + community(h, homes);
    const solar = clearSky(m) * cloud;

    const p = plan(S.ai, S.day, m);
    const { up, batt, grid, soc } = dispatch(m, S.soc, solar, load, p);
    S.soc = soc; S.floor = p.floor;
    S.solarKw = solar; S.loadKw = load; S.battKw = batt; S.gridKw = grid; S.up = up;
    S.genToday += solar / 60;
    if (grid < 0) { S.expToday += -grid / 60; S.earn += (-grid / 60) * EXPORT_RATE; }
    if (grid > 0) S.impToday += grid / 60;
    const slot = Math.floor(m / 15);
    S.curveSolar[slot] = solar; S.curveLoad[slot] = load;

    S.min += 1;
    if (S.min >= 1440) newDay();
  }

  function newDay() {
    S.min = 0; S.day += 1; S.genToday = S.expToday = S.impToday = S.earn = 0;
    S.curveSolar.fill(null); S.curveLoad.fill(null);
    houses.forEach(hs => { hs.kwhToday = 0; if (hs.balance < 60) hs.balance += 300; });
  }

  // warm up: run the day from midnight to the start time so totals and the curve agree
  while (S.min < START_MIN) step();

  // ---------- rendering ----------
  const $ = s => document.querySelector(s);
  const binds = {};
  document.querySelectorAll("[data-bind]").forEach(el => (binds[el.dataset.bind] ||= []).push(el));
  const set = (k, v) => (binds[k] || []).forEach(el => { if (el.textContent !== v) el.textContent = v; });
  const fmt = (n, d = 1) => n.toLocaleString("en-IN", { minimumFractionDigits: d, maximumFractionDigits: d });
  const hhmm = m => String(Math.floor(m / 60) % 24).padStart(2, "0") + ":" + String(Math.floor(m % 60)).padStart(2, "0");

  // the full control room only exists on the dashboard page; the home page just shows the bound figures
  const moduleEl = $("#module");
  const full = !!moduleEl;

  // household module
  const cells = !full ? [] : houses.map(hs => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "house";
    b.setAttribute("aria-pressed", String(hs.id === S.selected));
    b.innerHTML = `<span class="n">#${String(hs.id).padStart(2, "0")}</span><span class="kw"></span><span class="flow" aria-hidden="true"></span>`;
    b.addEventListener("click", () => { S.selected = hs.id; cells.forEach((c, i) => c.setAttribute("aria-pressed", String(i + 1 === hs.id))); renderDetail(); });
    moduleEl.appendChild(b);
    return b;
  });

  function renderDetail() {
    const hs = houses[S.selected - 1];
    const low = hs.balance < 60;
    const days = hs.kwhToday > 0.05 ? hs.balance / (Math.max(hs.kwhToday, 0.4) * PREPAID_RATE) : 30;
    $("#detail").innerHTML = `
      <h3>Selected meter</h3>
      <h4>House #${String(hs.id).padStart(2, "0")}</h4>
      <div style="color:var(--muted);font-size:15px">${PROFILES[hs.type].label}</div>
      <span class="pill ${low ? "warn" : "ok"}">${hs.balance > 0 ? (low ? "Active · low balance" : "Active · normal flow") : "Paused · recharge needed"}</span>
      <dl class="kv">
        <dt>Drawing now</dt><dd>${fmt(hs.kw * 1000, 0)} W</dd>
        <dt>Used today</dt><dd>${fmt(hs.kwhToday, 2)} kWh</dd>
        <dt>Prepaid balance</dt><dd>₹${fmt(hs.balance, 2)}</dd>
        <dt>Lasts about</dt><dd>${days >= 30 ? "30+ days" : fmt(days, 0) + " days"}</dd>
        <dt>MCB / ELCB</dt><dd>Closed · no leakage</dd>
      </dl>
      <p class="hint">${low ? "An SMS recharge reminder has gone to this household." : "Tap any house in the grid to read its meter."}</p>`;
  }

  // chart
  const chart = $("#chart");
  const W = 600, H = 150, PAD_B = 20, PAD_T = 16, MAXKW = 40;
  const x = slot => (slot / 96) * W;
  const y = kw => PAD_T + (1 - kw / MAXKW) * (H - PAD_T - PAD_B);
  function renderChart() {
    let g = "";
    CUTS.forEach(([a, b]) => { g += `<rect class="cut" x="${x(a * 4)}" y="${PAD_T}" width="${x((b - a) * 4)}" height="${H - PAD_T - PAD_B}"/>`; });
    [10, 20, 30, 40].forEach(k => { g += `<line class="grid" x1="0" x2="${W}" y1="${y(k)}" y2="${y(k)}"/><text x="${W - 2}" y="${y(k) - 3}" text-anchor="end">${k} kW</text>`; });
    [0, 6, 12, 18].forEach(hr => { g += `<text x="${x(hr * 4) + (hr ? 0 : 2)}" y="${H - 4}" text-anchor="${hr ? "middle" : "start"}">${String(hr).padStart(2, "0")}:00</text>`; });
    const pts = (arr) => arr.map((v, i) => (v == null ? null : `${x(i + 0.5).toFixed(1)},${y(v).toFixed(1)}`)).filter(Boolean);
    const sp = pts(S.curveSolar), lp = pts(S.curveLoad);
    if (sp.length > 1) {
      const first = sp[0].split(",")[0], last = sp[sp.length - 1].split(",")[0];
      g += `<polygon class="area" points="${first},${y(0)} ${sp.join(" ")} ${last},${y(0)}"/>`;
      g += `<polyline class="line" points="${sp.join(" ")}"/>`;
    }
    if (lp.length > 1) g += `<polyline class="load" points="${lp.join(" ")}"/>`;
    const nowX = x(S.min / 15);
    g += `<circle class="now" cx="${nowX}" cy="${y(S.solarKw)}" r="4"/>`;
    chart.innerHTML = g;
  }

  // battery depletion curve: run the next 24 h on forecast weather and expected load, with and without the AI plan
  function project(ai) {
    let soc = S.soc, day = S.day, m = S.min, p;
    const out = [];
    for (let k = 0; k <= 1440; k++) {
      if (k % 15 === 0) { p = plan(ai, day, m); out.push(soc); }
      soc = dispatch(m, soc, forecastSolar(m, day), EXP_LOAD[Math.floor(m / 60)], p).soc;
      if (++m >= 1440) { m = 0; day++; }
    }
    return out;
  }

  const socChart = $("#socChart");
  const SW = 300, SH = 120, ST = 8, SB = 20;
  const sx = i => (i / 96) * SW;
  const sy = v => ST + (1 - v) * (SH - ST - SB);
  function renderSoc() {
    let g = "";
    for (let i = 0; i < 96; i++) {
      if (!gridUp((S.min + i * 15) % 1440)) g += `<rect class="cut" x="${sx(i).toFixed(1)}" y="${ST}" width="${(sx(1) + 0.4).toFixed(1)}" height="${SH - ST - SB}"/>`;
    }
    g += `<line class="grid" x1="0" x2="${SW}" y1="${sy(SOC_MIN)}" y2="${sy(SOC_MIN)}"/><text x="${SW - 2}" y="${sy(SOC_MIN) - 3}" text-anchor="end">20% floor</text>`;
    g += `<line class="grid" x1="0" x2="${SW}" y1="${sy(1)}" y2="${sy(1)}"/><text x="${SW - 2}" y="${sy(1) + 12}" text-anchor="end">100%</text>`;
    const line = arr => arr.map((v, i) => `${sx(i).toFixed(1)},${sy(v).toFixed(1)}`).join(" ");
    g += `<polyline class="alt" points="${line(project(!S.ai))}"/><polyline class="proj" points="${line(project(S.ai))}"/>`;
    ["Now", "+6 h", "+12 h", "+18 h", "+24 h"].forEach((t, k) => {
      const anchor = k === 0 ? "start" : k === 4 ? "end" : "middle";
      g += `<text x="${sx(k * 24)}" y="${SH - 4}" text-anchor="${anchor}">${t}</text>`;
    });
    socChart.innerHTML = g;
  }

  const skyWord = w => (w >= 0.8 ? "Sunny" : w >= 0.6 ? "Partly cloudy" : "Cloudy");

  function render() {
    set("clock", hhmm(S.min));
    set("solarKw", fmt(S.solarKw));
    set("loadKw", fmt(S.loadKw));
    set("genToday", fmt(S.genToday, 0));
    const pct = Math.round(S.soc * 100);
    set("soc", String(pct));
    set("kwhStored", fmt(S.soc * BATT_KWH, 0));
    set("earn", fmt(S.earn, 2));
    set("expToday", fmt(S.expToday, 1));
    const active = houses.filter(h => h.balance > 0).length;
    set("homesOn", String(active));
    set("lowCount", String(houses.filter(h => h.balance < 60).length));
    if (!full) return;

    const fill = $("#socFill");
    fill.style.width = pct + "%";
    fill.classList.toggle("charging", S.battKw > 0.05);
    const bf = $("#battFlow");
    bf.textContent = S.battKw > 0.05 ? `Charging ${fmt(S.battKw)} kW` : S.battKw < -0.05 ? `Supplying ${fmt(-S.battKw)} kW` : "Idle";
    const usable = Math.max(0, (S.soc - SOC_MIN) * BATT_KWH);
    const net = Math.max(0.1, S.loadKw - S.solarKw);
    set("backup", S.solarKw >= S.loadKw ? "Solar covers load" : `${fmt(usable / net, 1)} h`);
    const tmr = sunOn(S.day + 1);
    $("#fcast").textContent = `${skyWord(tmr)} · ${Math.round(tmr * 100)}% sun`;
    $("#reserve").textContent = S.ai ? `${Math.round(S.floor * 100)}% (AI plan)` : "20% (fixed)";
    $("#modeNow").textContent = `Projected, AI ${S.ai ? "on" : "off"}`;
    $("#modeAlt").textContent = `If AI were ${S.ai ? "off" : "on"}`;

    const gp = $("#gridPill");
    if (!S.up) { gp.className = "pill cut"; gp.textContent = "Cut · islanded"; }
    else if (S.gridKw < -0.05) { gp.className = "pill sun"; gp.textContent = `Exporting ${fmt(-S.gridKw)} kW`; }
    else if (S.gridKw > 0.05) { gp.className = "pill warn"; gp.textContent = `Importing ${fmt(S.gridKw)} kW`; }
    else { gp.className = "pill ok"; gp.textContent = "Connected"; }

    // the screen's one finding
    const dot = $("#stateDot"), f = $("#finding");
    const nextCut = CUTS.find(([a]) => a * 60 > S.min);
    const cutAt = String((nextCut || CUTS[0])[0]).padStart(2, "0") + ":00";
    dot.className = "state-dot";
    if (!S.up) {
      const end = CUTS.find(([a, b]) => S.min >= a * 60 && S.min < b * 60)[1];
      dot.className = "state-dot island";
      f.textContent = `The grid is down until ${String(end).padStart(2, "0")}:00, but our microgrid is running on its own and all ${active} homes still have power.`;
    } else if (S.gridKw < -0.05) {
      f.textContent = `The battery is nearly full, so the spare ${fmt(-S.gridKw)} kW is being sold to the grid.`;
    } else if (S.solarKw > S.loadKw) {
      f.textContent = `The sun is covering the whole village and charging the battery${nextCut ? ` ahead of the ${cutAt} cut` : ""}.`;
    } else if (S.ai && S.battKw > 0.05) {
      f.textContent = `${skyWord(tmr)} skies are forecast tomorrow, so Weather AI is topping the battery up to ${Math.round(S.floor * 100)}% while the grid is still on.`;
    } else if (S.ai && S.battKw > -0.05) {
      f.textContent = `Weather AI is saving the battery at ${pct}% for the ${cutAt} cut, so the grid is carrying the village for now.`;
    } else if (S.battKw < -0.05) {
      f.textContent = `The sun's down, so the battery is carrying ${fmt(S.loadKw)} kW of village load.`;
    } else {
      f.textContent = `The battery is resting at its 20% reserve, and the grid is carrying ${fmt(S.loadKw)} kW of village load.`;
    }

    houses.forEach((hs, i) => {
      const c = cells[i];
      const t = hs.kw >= 1 ? fmt(hs.kw, 1) + " kW" : fmt(hs.kw * 1000, 0) + " W";
      const k = c.children[1];
      if (k.textContent !== t) k.textContent = t;
      c.classList.toggle("low", hs.balance < 60);
      c.setAttribute("aria-label", `House ${hs.id}, ${PROFILES[hs.type].label}, drawing ${t}${hs.balance < 60 ? ", low balance" : ""}`);
    });
    renderDetail();
    renderChart();
    renderSoc();
  }

  // ---------- clock ----------
  let acc = 0, last = performance.now();
  function tick(now) {
    const dt = Math.min(1, (now - last) / 1000); last = now;
    acc += dt * S.speed; // simulated seconds
    let n = 0;
    while (acc >= 60 && n < 30) { step(); acc -= 60; n++; }
    if (n) render();
    requestAnimationFrame(tick);
  }
  render();
  requestAnimationFrame(tick);

  document.querySelectorAll(".seg button").forEach(b => b.addEventListener("click", () => {
    S.speed = Number(b.dataset.speed);
    document.querySelectorAll(".seg button").forEach(o => o.setAttribute("aria-pressed", String(o === b)));
  }));

  const aiBtn = $("#aiToggle");
  if (aiBtn) aiBtn.addEventListener("click", () => {
    S.ai = !S.ai;
    S.floor = plan(S.ai, S.day, S.min).floor;
    aiBtn.setAttribute("aria-checked", String(S.ai));
    render();
  });
})();
