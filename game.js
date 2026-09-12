(() => {
  const canvas = document.getElementById("pan");
  const ctx = canvas.getContext("2d");
  const ticketEl = document.getElementById("ticket");
  const scoreEl = document.getElementById("score");
  const heatEl = document.getElementById("heat");
  const cookTopEl = document.getElementById("cookTop");
  const cookBotEl = document.getElementById("cookBot");
  const hintEl = document.getElementById("hint");
  const overlay = document.getElementById("overlay");
  const toast = document.getElementById("toast");
  const btnPlate = document.getElementById("btnPlate");

  const STYLES = [
    { id: "Sunny Side Up", flips: 0, top: [0.55, 0.95], bot: [0.0, 0.18], yolk: "runny" },
    { id: "Over Easy", flips: 1, top: [0.45, 0.85], bot: [0.18, 0.42], yolk: "runny" },
    { id: "Over Medium", flips: 1, top: [0.55, 0.92], bot: [0.45, 0.72], yolk: "jammy" },
    { id: "Over Hard", flips: 1, top: [0.7, 1.0], bot: [0.72, 1.0], yolk: "set" },
  ];

  const state = {
    w: 0, h: 0, dpr: 1,
    running: false,
    score: 0,
    ticket: STYLES[1],
    egg: null,
    tiltX: 0,
    tiltY: 0,
    gyroOn: false,
    lastGyro: 0,
    lastBeta: 0,
    lastGamma: 0,
    flickCooldown: 0,
    particles: [],
    drag: null,
    oil: 0.7,
  };

  function resize() {
    const rect = canvas.getBoundingClientRect();
    state.dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    state.w = rect.width;
    state.h = rect.height;
    canvas.width = Math.floor(rect.width * state.dpr);
    canvas.height = Math.floor(rect.height * state.dpr);
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
  }
  window.addEventListener("resize", resize);

  function panGeom() {
    const cx = state.w / 2;
    const cy = state.h * 0.48;
    const rx = Math.min(state.w * 0.42, 210);
    const ry = Math.min(state.h * 0.34, 160);
    return { cx, cy, rx, ry };
  }

  function crackEgg() {
    const p = panGeom();
    state.egg = {
      x: p.cx, y: p.cy, vx: 0, vy: 0,
      r: Math.min(p.rx, p.ry) * 0.34,
      flipped: false, airborne: 0, rot: 0, vrot: 0,
      cookTop: 0, cookBot: 0.02, yolk: 1,
      broken: false, plated: false, flipsDone: 0, age: 0,
    };
    btnPlate.disabled = false;
    hintEl.textContent = "Keep the yolk centered. Heat cooks the side on the pan.";
    showToast("Egg in the pan");
  }

  function nextTicket() {
    state.ticket = STYLES[Math.floor(Math.random() * STYLES.length)];
    ticketEl.textContent = state.ticket.id;
    state.egg = null;
    btnPlate.disabled = true;
    hintEl.textContent = `Ticket: ${state.ticket.id}. Crack an egg.`;
  }

  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.remove("hidden");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toast.classList.add("hidden"), 1400);
  }

  function tryFlip(force) {
    const e = state.egg;
    if (!e || e.broken || e.plated || e.airborne > 0 || state.flickCooldown > 0) return;
    const heat = Number(heatEl.value);
    const needed = 0.55 + heat * 0.08;
    if (force < needed) {
      showToast("Too weak — yolk jiggled");
      e.yolk = Math.max(0, e.yolk - 0.04);
      return;
    }
    if (force > 2.4) {
      breakYolk(e, "Flip too violent");
      return;
    }
    e.airborne = 0.55;
    e.vrot = force * 10 * (Math.random() < 0.5 ? 1 : -1);
    e.vy -= 180 * force;
    e.flipsDone += 1;
    state.flickCooldown = 0.35;
    if (navigator.vibrate) navigator.vibrate(18);
  }

  function breakYolk(e, why) {
    e.broken = true;
    e.yolk = 0;
    spawnMess(e);
    showToast(why || "Yolk broke");
    hintEl.textContent = "Broken. Plate it as a loss or crack another.";
  }

  function spawnMess(e) {
    for (let i = 0; i < 18; i++) {
      state.particles.push({
        x: e.x, y: e.y,
        vx: (Math.random() - 0.5) * 220,
        vy: (Math.random() - 0.5) * 180,
        life: 0.7 + Math.random() * 0.5,
        c: Math.random() > 0.4 ? "#f0c43a" : "#f7f2e4",
      });
    }
  }

  function plate() {
    const e = state.egg;
    if (!e || e.plated) return;
    e.plated = true;
    const t = state.ticket;
    let pts = 0;
    let notes = [];
    if (e.broken) {
      notes.push("Broken yolk");
      pts = 5;
    } else {
      pts = 40;
      const topOk = e.cookTop >= t.top[0] && e.cookTop <= t.top[1];
      const botOk = e.cookBot >= t.bot[0] && e.cookBot <= t.bot[1];
      const flipOk = e.flipsDone === t.flips || (t.flips === 0 && e.flipsDone === 0);
      if (topOk) pts += 20; else notes.push("White doneness off");
      if (botOk) pts += 20; else notes.push("Flip-side doneness off");
      if (flipOk) pts += 15; else notes.push(`Needed ${t.flips} flip(s), did ${e.flipsDone}`);
      pts += Math.round(e.yolk * 25);
      if (e.yolk > 0.92 && topOk && botOk && flipOk) {
        pts += 30;
        notes.push("Perfect yolk");
      }
    }
    state.score += pts;
    scoreEl.textContent = state.score;
    showToast(`+${pts}  ${notes[0] || "Plated"}`);
    setTimeout(nextTicket, 900);
  }

  function physics(dt) {
    const e = state.egg;
    const p = panGeom();
    state.flickCooldown = Math.max(0, state.flickCooldown - dt);
    state.particles.forEach((q) => {
      q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 280 * dt; q.life -= dt;
    });
    state.particles = state.particles.filter((q) => q.life > 0);
    if (!e || e.plated) return;

    e.age += dt;
    const heat = Number(heatEl.value);
    const ax = state.tiltX * 520 + (state.drag ? state.drag.ax : 0);
    const ay = state.tiltY * 520 + (state.drag ? state.drag.ay : 0);

    if (e.airborne > 0) {
      e.airborne -= dt;
      e.vy += 420 * dt;
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      e.rot += e.vrot * dt;
      if (e.airborne <= 0) {
        e.flipped = !e.flipped;
        e.rot = e.flipped ? Math.PI : 0;
        e.vrot = 0;
        e.vy = 0;
        const impact = Math.min(1.4, Math.hypot(e.vx, e.vy) / 280);
        if (impact > 0.85 && e.yolk < 0.55) breakYolk(e, "Hard landing");
        else if (impact > 1.05) {
          e.yolk = Math.max(0, e.yolk - 0.18);
          if (e.yolk <= 0) breakYolk(e, "Yolk sheared");
        }
      }
    } else {
      e.vx += ax * dt;
      e.vy += ay * dt;
      e.vx *= 0.86;
      e.vy *= 0.86;
      e.x += e.vx * dt;
      e.y += e.vy * dt;

      const dx = (e.x - p.cx) / p.rx;
      const dy = (e.y - p.cy) / p.ry;
      const d = dx * dx + dy * dy;
      if (d > 0.82) {
        const ang = Math.atan2(dy, dx);
        e.x = p.cx + Math.cos(ang) * p.rx * 0.9;
        e.y = p.cy + Math.sin(ang) * p.ry * 0.9;
        const speed = Math.hypot(e.vx, e.vy);
        e.vx *= -0.25;
        e.vy *= -0.25;
        if (speed > 220) {
          e.yolk = Math.max(0, e.yolk - 0.12);
          if (e.yolk <= 0) breakYolk(e, "Hit the rim");
        }
      }

      const cook = heat * dt * 0.22;
      if (e.flipped) e.cookTop = Math.min(1.2, e.cookTop + cook);
      else e.cookBot = Math.min(1.2, e.cookBot + cook);

      if (heat > 1.35 && Math.random() < dt * 0.4) {
        e.yolk = Math.max(0.2, e.yolk - 0.01);
      }
    }

    cookBotEl.style.width = `${Math.min(100, e.cookBot * 100)}%`;
    cookTopEl.style.width = `${Math.min(100, e.cookTop * 100)}%`;
  }

  function draw() {
    const w = state.w, h = state.h;
    ctx.clearRect(0, 0, w, h);
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#2a1c12");
    g.addColorStop(1, "#120c08");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    const p = panGeom();
    ctx.save();
    ctx.translate(p.cx, p.cy + 18);
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath();
    ctx.ellipse(0, p.ry * 0.55, p.rx * 0.95, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(p.cx, p.cy);
    ctx.fillStyle = "#2b3036";
    ctx.beginPath();
    ctx.ellipse(0, 0, p.rx + 18, p.ry + 16, 0, 0, Math.PI * 2);
    ctx.fill();
    const stove = ctx.createRadialGradient(0, 0, 20, 0, 0, p.rx);
    stove.addColorStop(0, "#6a3a18");
    stove.addColorStop(0.55, "#3a2214");
    stove.addColorStop(1, "#1a100c");
    ctx.fillStyle = stove;
    ctx.beginPath();
    ctx.ellipse(0, 0, p.rx, p.ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#8a6a44";
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.restore();

    const e = state.egg;
    if (e) {
      ctx.save();
      ctx.translate(e.x, e.y);
      const lift = e.airborne > 0 ? 1 + (0.55 - e.airborne) * 0.8 : 1;
      ctx.scale(lift, lift);
      ctx.rotate(e.rot);

      const whiteCook = e.flipped ? e.cookTop : e.cookBot;
      const white = whiteCook < 0.25 ? "rgba(255,252,240,0.72)" : whiteCook < 0.6 ? "#f4eedc" : "#efe4c4";
      ctx.fillStyle = white;
      ctx.beginPath();
      ctx.ellipse(0, 0, e.r * 1.55, e.r * 1.2, 0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.18)";
      ctx.beginPath();
      ctx.ellipse(-e.r * 0.35, -e.r * 0.35, e.r * 0.55, e.r * 0.28, -0.4, 0, Math.PI * 2);
      ctx.fill();

      if (!e.broken) {
        const yg = ctx.createRadialGradient(-e.r * 0.12, -e.r * 0.1, 4, 0, 0, e.r * 0.62);
        yg.addColorStop(0, "#ffe98a");
        yg.addColorStop(0.55, "#f0b429");
        yg.addColorStop(1, e.yolk > 0.5 ? "#d88912" : "#b45a10");
        ctx.fillStyle = yg;
        const squash = 0.92 + (1 - e.yolk) * 0.18;
        ctx.beginPath();
        ctx.ellipse(0, 0, e.r * 0.62, e.r * 0.55 * squash, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,240,0.45)";
        ctx.beginPath();
        ctx.ellipse(-e.r * 0.18, -e.r * 0.16, e.r * 0.16, e.r * 0.1, -0.5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = "#e8b43a";
        ctx.beginPath();
        ctx.ellipse(8, 4, e.r * 0.7, e.r * 0.28, 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    state.particles.forEach((q) => {
      ctx.globalAlpha = Math.max(0, q.life);
      ctx.fillStyle = q.c;
      ctx.beginPath();
      ctx.arc(q.x, q.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    });

    ctx.fillStyle = "#cbb79a";
    ctx.font = "12px system-ui";
    ctx.textAlign = "center";
    const gyroLabel = state.gyroOn ? "GYRO LIVE" : "TOUCH / SWIPE";
    ctx.fillText(gyroLabel, w / 2, h - 10);
  }

  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    if (state.running) physics(dt);
    draw();
    requestAnimationFrame(loop);
  }

  function onOrient(ev) {
    const beta = ev.beta || 0;
    const gamma = ev.gamma || 0;
    state.tiltX = Math.max(-1, Math.min(1, gamma / 28));
    state.tiltY = Math.max(-1, Math.min(1, (beta - 35) / 28));
    const t = performance.now();
    if (state.lastGyro) {
      const dt = Math.max(8, t - state.lastGyro);
      const dBeta = Math.abs(beta - state.lastBeta);
      const dGamma = Math.abs(gamma - state.lastGamma);
      const impulse = (dBeta + dGamma) / dt * 12;
      if (impulse > 1.15) tryFlip(impulse);
    }
    state.lastGyro = t;
    state.lastBeta = beta;
    state.lastGamma = gamma;
  }

  async function enableGyro() {
    try {
      if (typeof DeviceOrientationEvent !== "undefined" &&
          typeof DeviceOrientationEvent.requestPermission === "function") {
        const res = await DeviceOrientationEvent.requestPermission();
        if (res !== "granted") {
          showToast("Gyro permission denied");
          return;
        }
      }
      window.addEventListener("deviceorientation", onOrient, true);
      state.gyroOn = true;
      showToast("Gyro on — tilt the pan");
    } catch (err) {
      showToast("Gyro unavailable — use touch");
    }
  }

  canvas.addEventListener("pointerdown", (ev) => {
    if (!state.egg) return;
    const rect = canvas.getBoundingClientRect();
    state.drag = {
      x: ev.clientX - rect.left,
      y: ev.clientY - rect.top,
      px: ev.clientX, py: ev.clientY,
      ax: 0, ay: 0, t: performance.now(),
    };
    canvas.setPointerCapture(ev.pointerId);
  });
  canvas.addEventListener("pointermove", (ev) => {
    if (!state.drag) return;
    const dx = ev.clientX - state.drag.px;
    const dy = ev.clientY - state.drag.py;
    state.drag.ax = dx * 18;
    state.drag.ay = dy * 18;
    state.drag.px = ev.clientX;
    state.drag.py = ev.clientY;
    if (dy < -28 && Math.abs(dy) > Math.abs(dx) * 1.2) {
      tryFlip(Math.min(2.2, Math.abs(dy) / 40));
    }
  });
  canvas.addEventListener("pointerup", () => { state.drag = null; });
  canvas.addEventListener("pointercancel", () => { state.drag = null; });

  document.getElementById("btnGyro").onclick = enableGyro;
  document.getElementById("btnCrack").onclick = crackEgg;
  document.getElementById("btnPlate").onclick = plate;
  document.getElementById("btnFlick").onclick = () => tryFlip(1.15);
  document.getElementById("btnStart").onclick = () => {
    overlay.classList.add("hidden");
    state.running = true;
    nextTicket();
    resize();
  };

  resize();
  requestAnimationFrame(loop);
})();
