(() => {
  "use strict";
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------- Latest release version from the GitHub API (falls back to the HTML value) ----------
  fetch("https://api.github.com/repos/PQMarine/UnderworldRevisited/releases/latest")
    .then(r => (r.ok ? r.json() : null))
    .then(j => {
      if (!j || !j.tag_name) return;
      const v = String(j.tag_name).replace(/^v/, "");
      document.querySelectorAll("[data-version]").forEach(el => { el.textContent = v; });
    })
    .catch(() => {});

  // ---------- Nav: shadow on scroll, mobile menu, active link ----------
  const nav = document.getElementById("nav");
  const toggle = document.getElementById("navToggle");
  const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 40);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  toggle.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(open));
  });
  document.querySelectorAll(".nav-links a").forEach(a => a.addEventListener("click", () => {
    nav.classList.remove("open");
    toggle.setAttribute("aria-expanded", "false");
  }));
  const links = new Map([...document.querySelectorAll(".nav-links a")].map(a => [a.getAttribute("href").slice(1), a]));
  const spy = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      links.forEach(a => a.classList.remove("active"));
      const a = links.get(e.target.id);
      if (a) a.classList.add("active");
    });
  }, { rootMargin: "-45% 0px -50% 0px" });
  links.forEach((_, id) => { const s = document.getElementById(id); if (s) spy.observe(s); });

  // ---------- Reveal on scroll, staggered per parent ----------
  const reveals = document.querySelectorAll(".reveal");
  const groups = new Map();
  reveals.forEach(el => {
    const p = el.parentElement;
    const i = groups.get(p) || 0;
    groups.set(p, i + 1);
    el.style.setProperty("--d", Math.min(i * 0.07, 0.5) + "s");
  });
  if (reduce || !("IntersectionObserver" in window)) {
    reveals.forEach(el => el.classList.add("in"));
  } else {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    reveals.forEach(el => io.observe(el));
  }

  // ---------- Counters ----------
  const counters = document.querySelectorAll("[data-count]");
  const countIO = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const el = e.target, target = +el.dataset.count;
      countIO.unobserve(el);
      if (reduce) { el.textContent = target; return; }
      const t0 = performance.now(), dur = 1400;
      const step = t => {
        const k = Math.min(1, (t - t0) / dur);
        el.textContent = Math.round(target * (1 - Math.pow(1 - k, 3)));
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }, { threshold: 0.6 });
  counters.forEach(c => countIO.observe(c));

  // ---------- Compare slider ----------
  const box = document.getElementById("compareBox");
  const range = document.getElementById("compareRange");
  const setPos = v => box.style.setProperty("--pos", v + "%");
  range.addEventListener("input", () => setPos(range.value));
  // A gentle sweep once it comes into view, to show it can be dragged.
  if (!reduce) {
    const sweepIO = new IntersectionObserver(entries => {
      if (!entries[0].isIntersecting) return;
      sweepIO.disconnect();
      const t0 = performance.now();
      let touched = false;
      range.addEventListener("pointerdown", () => { touched = true; }, { once: true });
      const anim = t => {
        if (touched) return;
        const k = (t - t0) / 2200;
        if (k >= 1) { setPos(50); range.value = 50; return; }
        const v = 50 + Math.sin(k * Math.PI * 2) * 28;
        setPos(v); range.value = v;
        requestAnimationFrame(anim);
      };
      setTimeout(() => requestAnimationFrame(anim), 500);
    }, { threshold: 0.5 });
    sweepIO.observe(box);
  }

  // ---------- Hero video: a fixed view, played only while the hero is on screen ----------
  const heroVideo = document.getElementById("heroVideo");
  if (heroVideo) {
    if (reduce) { heroVideo.removeAttribute("autoplay"); heroVideo.pause(); }
    else {
      const heroIO = new IntersectionObserver(entries => {
        const p = entries[0].isIntersecting ? heroVideo.play() : (heroVideo.pause(), null);
        if (p && p.catch) p.catch(() => {});
      }, { threshold: 0.05 });
      heroIO.observe(document.querySelector(".hero"));
    }
  }

  // ---------- UW2 pictures: a slow crossfade, dots or a click to step ----------
  const uw2Stage = document.getElementById("uw2Stage");
  if (uw2Stage) {
    const pics = [...uw2Stage.querySelectorAll("img, video")];
    const label = p => p.alt || p.getAttribute("aria-label") || "";
    const cap = document.getElementById("uw2Cap");
    const dotsBox = document.getElementById("uw2Dots");
    let cur = 0, timer = null, uw2Visible = false;
    const dots = pics.map((p, i) => {
      const d = document.createElement("button");
      d.setAttribute("role", "tab");
      d.setAttribute("aria-label", label(p));
      d.addEventListener("click", e => { e.stopPropagation(); show(i); restart(); });
      dotsBox.appendChild(d);
      return d;
    });
    const show = i => {
      cur = (i + pics.length) % pics.length;
      pics.forEach((p, k) => p.classList.toggle("on", k === cur));
      dots.forEach((d, k) => d.setAttribute("aria-selected", String(k === cur)));
      cap.textContent = pics[cur].dataset.cap;
      // A video slide plays only while it is shown and the section is on screen.
      pics.forEach((p, k) => {
        if (p.tagName !== "VIDEO") return;
        if (k === cur && uw2Visible && !reduce) { const r = p.play(); if (r && r.catch) r.catch(() => {}); }
        else p.pause();
      });
    };
    const restart = () => {
      clearTimeout(timer); timer = null;
      if (reduce || !uw2Visible) return;
      const hold = +(pics[cur].dataset.hold || 6000);
      timer = setTimeout(() => { show(cur + 1); restart(); }, hold);
    };
    uw2Stage.addEventListener("click", () => { show(cur + 1); restart(); });
    new IntersectionObserver(e => { uw2Visible = e[0].isIntersecting; show(cur); restart(); }, { threshold: 0.3 }).observe(uw2Stage);
    show(0);
  }

  // ---------- Graphics lab ----------
  const lab = { mode: "palette", fx: "full" };
  const labStage = document.getElementById("labStage");
  const labBadge = document.getElementById("labBadge");
  const labText = document.getElementById("labText");
  const modeNames = { palette: "Palette", colours: "Palette colours", remastered: "Remastered" };
  const fxNames = { off: "Off", subtle: "Subtle", full: "Full" };
  const modeText = {
    palette: "Palette computes light like the original, through the game's own shade and light tables.",
    colours: "Palette colours draws real light and its shadows, but only in the original's colours and with its dither.",
    remastered: "Remastered lights the dungeon with URP: relief, specular highlights, glow, shadows and torch light."
  };
  // One <img> per combination, preloaded, so switching is a crossfade.
  const labImgs = {};
  const firstImg = labStage.querySelector("img");
  ["palette", "colours", "remastered"].forEach(m => ["off", "subtle", "full"].forEach(f => {
    const key = m + "-" + f;
    let img = key === "palette-full" ? firstImg : null;
    if (!img) {
      img = document.createElement("img");
      img.src = `img/lab-${key}.jpg`;
      img.alt = `${modeNames[m]} mode, effects ${fxNames[f]}`;
      img.decoding = "async";
      labStage.insertBefore(img, labBadge);
    }
    labImgs[key] = img;
  }));
  let peeking = false;
  const renderLab = () => {
    const fx = peeking ? "off" : lab.fx;
    const key = lab.mode + "-" + fx;
    Object.entries(labImgs).forEach(([k, img]) => img.classList.toggle("on", k === key));
    labBadge.textContent = `${modeNames[lab.mode]} · ${fxNames[fx]}`;
    labStage.classList.toggle("peek", peeking);
    labText.textContent = modeText[lab.mode];
  };
  document.querySelectorAll(".seg[data-group]").forEach(seg => {
    const group = seg.dataset.group;
    seg.querySelectorAll("button").forEach(btn => btn.addEventListener("click", () => {
      seg.querySelectorAll("button").forEach(b => b.setAttribute("aria-checked", String(b === btn)));
      lab[group] = btn.dataset.value;
      renderLab();
    }));
  });
  const peekOn = e => { e.preventDefault(); peeking = true; renderLab(); };
  const peekOff = () => { if (!peeking) return; peeking = false; renderLab(); };
  labStage.addEventListener("pointerdown", peekOn);
  ["pointerup", "pointerleave", "pointercancel"].forEach(ev => labStage.addEventListener(ev, peekOff));
  labStage.addEventListener("contextmenu", e => e.preventDefault());
  renderLab();

  // ---------- Light colour ----------
  const lightStage = document.getElementById("lightStage");
  const lightImgs = new Map();
  const lightFirst = lightStage.querySelector("img");
  document.querySelectorAll(".swatches button").forEach((btn, i) => {
    let img = i === 0 ? lightFirst : null;
    if (!img) {
      img = document.createElement("img");
      img.src = btn.dataset.img;
      img.alt = `Remastered, ${btn.textContent.trim().toLowerCase()} light`;
      img.decoding = "async";
      lightStage.appendChild(img);
    }
    lightImgs.set(btn, img);
    btn.addEventListener("click", () => {
      lightImgs.forEach((im, b) => {
        b.setAttribute("aria-checked", String(b === btn));
        im.classList.toggle("on", b === btn);
      });
      lightStage.style.boxShadow = `0 40px 120px -30px rgba(0,0,0,.9), 0 0 90px -30px ${getComputedStyle(btn).getPropertyValue("--sw")}`;
    });
  });

  // ---------- Card spotlight + tilt ----------
  document.querySelectorAll("[data-tilt]").forEach(card => {
    card.addEventListener("pointermove", e => {
      const r = card.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      card.style.setProperty("--mx", x + "px");
      card.style.setProperty("--my", y + "px");
      if (reduce || e.pointerType !== "mouse") return;
      const rx = ((y / r.height) - 0.5) * -5;
      const ry = ((x / r.width) - 0.5) * 5;
      card.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-3px)`;
    });
    card.addEventListener("pointerleave", () => { card.style.transform = ""; });
  });

  // ---------- Interface tabs ----------
  // Tabs over a stack of same-spot pictures: a switch crossfades, so only what changes changes.
  const crossfadeTabs = (tabsId, frameId, capId, altSuffix) => {
    const tabs = document.getElementById(tabsId);
    if (!tabs) return;
    const glider = tabs.querySelector(".tab-glider");
    const frame = document.getElementById(frameId);
    const cap = document.getElementById(capId);
    const buttons = [...tabs.querySelectorAll("button")];
    const moveGlider = btn => {
      glider.style.left = btn.offsetLeft + "px";
      glider.style.top = btn.offsetTop + "px";
      glider.style.width = btn.offsetWidth + "px";
      glider.style.height = btn.offsetHeight + "px";
    };
    const imgs = buttons.map((b, i) => {
      const img = document.createElement("img");
      img.src = b.dataset.img;
      img.alt = b.textContent + altSuffix;
      img.decoding = "async";
      if (i === 0) img.classList.add("on");
      frame.appendChild(img);
      return img;
    });
    buttons.forEach((btn, i) => btn.addEventListener("click", () => {
      buttons.forEach(b => b.setAttribute("aria-selected", String(b === btn)));
      moveGlider(btn);
      imgs.forEach((img, k) => img.classList.toggle("on", k === i));
      cap.textContent = btn.dataset.cap;
    }));
    const sync = () => moveGlider(buttons.find(b => b.getAttribute("aria-selected") === "true"));
    window.addEventListener("resize", sync);
    window.addEventListener("load", sync);
    if (document.fonts) document.fonts.ready.then(sync);
    sync();
  };
  crossfadeTabs("ifaceTabs", "ifaceFrame", "ifaceCap", " interface");
  crossfadeTabs("helpTabs", "helpFrame", "helpCap", " in the help window");

  // ---------- Lightbox ----------
  const lb = document.getElementById("lightbox");
  const lbImg = document.getElementById("lbImg");
  const lbCap = document.getElementById("lbCap");
  const items = [...document.querySelectorAll("#galleryGrid a")];
  let idx = 0;
  const show = i => {
    idx = (i + items.length) % items.length;
    lbImg.src = items[idx].getAttribute("href");
    lbImg.alt = items[idx].querySelector("img").alt;
    lbCap.textContent = items[idx].dataset.cap || "";
  };
  items.forEach((a, i) => a.addEventListener("click", e => {
    e.preventDefault();
    show(i);
    lb.hidden = false;
    document.body.style.overflow = "hidden";
  }));
  const close = () => { lb.hidden = true; document.body.style.overflow = ""; };
  lb.querySelector(".lb-close").addEventListener("click", close);
  lb.querySelector(".lb-prev").addEventListener("click", () => show(idx - 1));
  lb.querySelector(".lb-next").addEventListener("click", () => show(idx + 1));
  lb.addEventListener("click", e => { if (e.target === lb) close(); });
  let tx = null;
  lb.addEventListener("touchstart", e => { tx = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener("touchend", e => {
    if (tx === null) return;
    const dx = e.changedTouches[0].clientX - tx;
    if (Math.abs(dx) > 50) show(idx + (dx < 0 ? 1 : -1));
    tx = null;
  });
  document.addEventListener("keydown", e => {
    if (lb.hidden) return;
    if (e.key === "Escape") close();
    if (e.key === "ArrowRight") show(idx + 1);
    if (e.key === "ArrowLeft") show(idx - 1);
  });

  // ---------- Hero parallax ----------
  const heroBg = document.querySelector(".hero-bg");
  if (!reduce) {
    window.addEventListener("scroll", () => {
      const y = window.scrollY;
      if (y < window.innerHeight) heroBg.style.transform = `translateY(${y * 0.3}px)`;
    }, { passive: true });
  }
  // ---------- Embers ----------
  const cv = document.getElementById("embers");
  const ctx = cv.getContext("2d");
  if (reduce || !ctx) { cv.remove(); return; }
  let W, H, dpr, parts = [];
  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = cv.width = Math.floor(innerWidth * dpr);
    H = cv.height = Math.floor(innerHeight * dpr);
    const n = Math.round(Math.min(70, innerWidth / 22));
    while (parts.length < n) parts.push(spawn(true));
    parts.length = n;
  };
  const spawn = anywhere => ({
    x: Math.random() * W,
    y: anywhere ? Math.random() * H : H + 10 * dpr,
    r: (Math.random() * 1.6 + 0.6) * dpr,
    vy: (Math.random() * 0.5 + 0.25) * dpr,
    sway: Math.random() * Math.PI * 2,
    sw: Math.random() * 0.02 + 0.005,
    life: Math.random() * 0.6 + 0.4,
    hue: 20 + Math.random() * 25
  });
  window.addEventListener("resize", resize);
  resize();
  let last = performance.now(), running = true;
  document.addEventListener("visibilitychange", () => {
    running = !document.hidden;
    if (running) { last = performance.now(); requestAnimationFrame(tick); }
  });
  function tick(t) {
    if (!running) return;
    const dt = Math.min(50, t - last) / 16.67;
    last = t;
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = "lighter";
    for (const p of parts) {
      p.y -= p.vy * dt;
      p.sway += p.sw * dt;
      p.x += Math.sin(p.sway) * 0.4 * dpr * dt;
      const fade = Math.max(0, Math.min(1, p.y / H)) * p.life;
      if (p.y < -10) Object.assign(p, spawn(false));
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
      g.addColorStop(0, `hsla(${p.hue}, 100%, 70%, ${0.9 * fade})`);
      g.addColorStop(0.4, `hsla(${p.hue}, 100%, 55%, ${0.35 * fade})`);
      g.addColorStop(1, "hsla(20, 100%, 50%, 0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 4, 0, Math.PI * 2);
      ctx.fill();
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();
