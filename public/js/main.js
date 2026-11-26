/* ==========================================================================
   Interactions — anime.js v4 (choreography) + Lenis (smooth scroll)
   Everything degrades: without JS the page is static and readable; with
   prefers-reduced-motion the spatial motion is skipped (opacity/colour stay).
   ========================================================================== */
(() => {
  "use strict";

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = document.documentElement;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const A = window.anime || null; // anime.js may fail to load — every feature checks
  // Settings from the CMS panel (window.SITE_CONFIG, written by shared/render.js)
  const CFG = window.SITE_CONFIG || {};
  const M = Object.assign({
    enabled: true, speed: 1, loader: true, smoothScroll: true, scrollLerp: 0.1, anchorDuration: 1.4,
    revealDuration: 1100, revealStagger: 70, revealDistance: 48, marquee: true, marqueeSpeed: 0.45,
    burst: true, burstCount: 10, magnetic: true, magnetStrength: 0.3, carouselEntrance: true,
  }, CFG.motion);
  const motion = !!A && !reduced && M.enabled;
  if (A && A.engine) A.engine.speed = M.speed; // global playback rate for every anime.js tween
  const { animate, createTimeline, stagger, createSpring, createAnimatable, utils } = A || {};
  const spring = (stiffness = 180, damping = 12) => createSpring({ stiffness, damping });
  if (motion) root.classList.add("anim");

  /* ---------------------------------------------------------------- i18n */
  const I18N = window.I18N || { pt: {} };
  let LANG = "pt";
  const t = (k) => (I18N[LANG] && I18N[LANG][k]) || I18N.pt[k] || k;
  const CV = Object.assign({ pt: "assets/brand/curriculo-guilherme-superti.pdf", en: "assets/brand/resume-guilherme-superti.pdf" }, CFG.cv);

  function setLang(l) {
    LANG = I18N[l] ? l : "pt";
    root.lang = LANG === "pt" ? "pt-BR" : LANG;
    document.title = t("doc.title");
    $$("[data-i18n]").forEach((n) => { n.textContent = t(n.dataset.i18n); });
    $$("[data-i18n-aria]").forEach((n) => n.setAttribute("aria-label", t(n.dataset.i18nAria)));
    $$(".nav .roll").forEach((n) => n.setAttribute("data-text", n.textContent));
    $$(".lang button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === LANG)));
    $$("[data-cv]").forEach((a) => { a.href = LANG === "pt" ? CV.pt : CV.en; });
    $$(".slide[data-pos]").forEach((s) => {
      const n = s.parentElement.children.length;
      s.setAttribute("aria-label", `${s.dataset.pos} ${t("ui.of")} ${n}`);
    });
    $$("[data-lightbox][data-alt]").forEach((b) => b.hasAttribute("aria-label") && b.setAttribute("aria-label", `${t("ui.zoom")}: ${b.dataset.alt}`));
    $$("[data-carousel]").forEach((c) => c._refresh && c._refresh());
    buildMarquee();
    try { localStorage.setItem("lang", LANG); } catch (e) { /* storage unavailable */ }
  }

  $$(".lang button").forEach((b) => b.addEventListener("click", () => {
    if (b.dataset.lang === LANG) return;
    if (motion) {
      // Text swap with a quick dip so the change is perceivable
      // Only dip what's on screen (and already revealed), so pending reveals stay hidden
      const targets = $$("main [data-i18n], .nav [data-i18n]").filter((n) => {
        const r = n.getBoundingClientRect();
        return r.bottom > 0 && r.top < innerHeight && getComputedStyle(n).opacity !== "0";
      });
      if (!targets.length) { setLang(b.dataset.lang); return; }
      animate(targets, { opacity: [1, 0], duration: 160, ease: "outQuad", onComplete: () => {
        setLang(b.dataset.lang);
        animate(targets, { opacity: [0, 1], duration: 320, ease: "outQuad" });
      } });
    } else setLang(b.dataset.lang);
  }));

  /* --------------------------------------------------------- smooth scroll */
  let lenis = null;
  if (!reduced && window.Lenis && M.enabled && M.smoothScroll) {
    lenis = new Lenis({ lerp: M.scrollLerp, wheelMultiplier: 1, smoothWheel: true });
    const raf = (time) => { lenis.raf(time); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }
  const headerH = () => $(".site-header").offsetHeight;
  function scrollToTarget(target) {
    if (lenis) {
      lenis.scrollTo(target, { offset: target === 0 ? 0 : -headerH() + 1, duration: Math.max(0.01, M.anchorDuration), easing: (x) => 1 - Math.pow(1 - x, 4) });
    } else if (target === 0) {
      scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
    } else {
      target.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
    }
  }
  $$('a[href^="#"]:not([data-project])').forEach((a) => a.addEventListener("click", (e) => {
    const id = a.getAttribute("href");
    const el = id === "#top" ? 0 : $(id);
    if (el === null) return;
    e.preventDefault();
    closeMenu();
    scrollToTarget(el);
    history.replaceState(null, "", id);
    // Move focus to the section for keyboard/screen-reader users (after the scroll settles)
    if (el !== 0) setTimeout(() => { el.setAttribute("tabindex", "-1"); el.focus({ preventScroll: true }); }, lenis ? M.anchorDuration * 1000 : 600);
  }));
  $(".to-top").addEventListener("click", () => { scrollToTarget(0); $(".brand").focus({ preventScroll: true }); });

  /* ---------------------------------------------------------------- header */
  const header = $(".site-header");
  const onScroll = () => header.classList.toggle("stuck", scrollY > 40);
  addEventListener("scroll", onScroll, { passive: true }); onScroll();

  // Scrollspy
  const spy = new IntersectionObserver((entries) => entries.forEach((en) => {
    if (!en.isIntersecting) return;
    $$(".nav a").forEach((a) => a.setAttribute("aria-current", String(a.getAttribute("href") === "#" + en.target.id)));
  }), { rootMargin: "-45% 0px -50% 0px" });
  $$("main section[id]").forEach((s) => spy.observe(s));

  // Mobile menu
  const burger = $(".burger"), nav = $("#nav");
  function closeMenu() { if (!nav.classList.contains("open")) return; nav.classList.remove("open"); burger.setAttribute("aria-expanded", "false"); lenis && lenis.start(); }
  burger.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    burger.setAttribute("aria-expanded", String(open));
    if (open) {
      lenis && lenis.stop();
      if (motion) animate($$(".nav li"), { opacity: [0, 1], y: [40, 0], delay: stagger(60, { start: 200 }), duration: 700, ease: "outExpo" });
    } else lenis && lenis.start();
  });
  addEventListener("keydown", (e) => { if (e.key === "Escape" && nav.classList.contains("open")) { closeMenu(); burger.focus(); } });

  /* --------------------------------------------------------------- marquee */
  function buildMarquee() {
    const track = $(".marquee-track"); if (!track) return;
    const words = t("marquee").split("|");
    const chunk = words.map((w) => `<span>${w}</span>`).join("");
    track.innerHTML = chunk + chunk + chunk;
  }
  if (motion && M.marquee) {
    // Scroll-linked (not autoplaying), eased with an animatable for a soft lag
    const track = $(".marquee-track");
    const mq = createAnimatable(track, { x: 900, ease: "out(3)" });
    let last = -1;
    const tick = () => {
      const y = scrollY;
      if (y !== last) {
        last = y;
        const third = track.scrollWidth / 3 || 1;
        mq.x(-((y * M.marqueeSpeed) % third));
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  /* ------------------------------------------------------------ text split */
  function splitChars(el) {
    const txt = el.textContent;
    el.textContent = "";
    for (const ch of txt) {
      const s = document.createElement("span");
      s.className = "char"; s.textContent = ch === " " ? " " : ch;
      el.appendChild(s);
    }
    return $$(".char", el);
  }
  // Wraps words of a heading (keeps nested spans such as the counter)
  function splitWords(el) {
    const out = [];
    const walk = (node) => {
      [...node.childNodes].forEach((c) => {
        if (c.nodeType === 3 && c.textContent.trim()) {
          const frag = document.createDocumentFragment();
          c.textContent.split(/(\s+)/).forEach((w) => {
            if (!w) return;
            if (/^\s+$/.test(w)) { frag.appendChild(document.createTextNode(w)); return; }
            // Mask with breathing room (tight tracking / CJK glyphs never get shaved)
            const outer = document.createElement("span"); outer.className = "w-mask";
            outer.style.cssText = "display:inline-block;overflow:clip;vertical-align:top;padding:.04em .14em .12em;margin:-.04em -.14em -.12em";
            const inner = document.createElement("span"); inner.style.display = "inline-block"; inner.textContent = w;
            outer.appendChild(inner); frag.appendChild(outer); out.push(inner);
          });
          c.replaceWith(frag);
        } else if (c.nodeType === 1 && !c.classList.contains("n")) walk(c);
        else if (c.nodeType === 1) out.push(c);
      });
    };
    walk(el);
    return out;
  }

  /* ------------------------------------------------------- scroll reveals */
  function reveal(el) {
    const type = el.dataset.reveal;
    if (type === "split") {
      const words = splitWords(el);
      el.style.opacity = 1;
      animate(words, { y: ["110%", "0%"], rotate: [6, 0], duration: M.revealDuration, delay: stagger(M.revealStagger), ease: "outExpo",
        // Drop the masks once revealed so nothing stays clipped
        onComplete: () => $$(".w-mask", el).forEach((m) => { m.style.overflow = "visible"; }) });
    } else if (type === "stagger") {
      el.style.opacity = 1;
      animate([...el.children], { opacity: [0, 1], y: [M.revealDistance * 0.75, 0], duration: M.revealDuration * 0.82, delay: stagger(M.revealStagger), ease: "outExpo" });
    } else {
      animate(el, { opacity: [0, 1], y: [M.revealDistance, 0], duration: M.revealDuration, ease: "outExpo" });
    }
  }
  function setupReveals() {
    const els = $$("[data-reveal]");
    if (!motion) { els.forEach((e) => { e.style.opacity = 1; }); return; }
    const io = new IntersectionObserver((entries) => entries.forEach((en) => {
      if (!en.isIntersecting) return;
      io.unobserve(en.target);
      reveal(en.target);
    }), { rootMargin: "0px 0px -12% 0px" });
    els.forEach((e) => io.observe(e));
    // Re-run splits after a language change would lose the spans — reveals run once, so
    // headings keep their text via data-i18n (set before reveal). Fine.
  }

  /* ------------------------------------------------------------ preloader */
  function intro() {
    const loader = $(".loader");
    const h1Lines = $$(".hero h1 .line");
    const chars = h1Lines.flatMap(splitChars);
    if (!motion) {
      if (loader) loader.hidden = true;
      return Promise.resolve();
    }
    utils.set(chars, { y: "110%" });
    utils.set($$(".hero-row, .hero-mascot, .pop, .scroll-hint"), { opacity: 0 });
    // Each card starts tucked inside the mascot's head and fans out to its place
    const head = $(".hero-mascot").getBoundingClientRect();
    const hx = head.left + head.width / 2, hy = head.top + head.height * .32;
    const pops = $$(".pop").map((el) => {
      const r = el.getBoundingClientRect();
      return { el, dx: hx - (r.left + r.width / 2), dy: hy - (r.top + r.height / 2) };
    });
    const counter = { v: 0 };
    const count = $(".loader-count");
    return new Promise((resolve) => {
      const tl = createTimeline({ defaults: { ease: "outExpo" }, onComplete: resolve });
      // The loader can be switched off in the panel (it is then not in the page at all)
      if (loader) tl.add(".loader-logo", { scale: [0, 1], rotate: [-180, 0], duration: 900, ease: spring(160, 11) })
        .add(counter, { v: 100, duration: 900, ease: "inOutQuad", modifier: Math.round, onUpdate: () => { count.textContent = counter.v; } }, "<<")
        .add(".loader-logo", { scale: [1, 22], opacity: [1, 0], duration: 700, ease: "inExpo" })
        .add(loader, { opacity: [1, 0], duration: 350, ease: "linear", onComplete: () => { loader.hidden = true; } }, "-=250");
      tl.add(chars, { y: ["110%", "0%"], rotate: [8, 0], duration: 1100, delay: stagger(28),
          onComplete: () => h1Lines.forEach((l) => { l.style.overflow = "visible"; }) }, loader ? "-=200" : 0)
        .add(".hero-mascot", { opacity: [0, 1], scale: [0, 1], rotate: [-90, 0], duration: 900, ease: spring(170, 10) }, "-=800");
      // Works pop out of the head one after another, fading in as they travel
      pops.forEach(({ el, dx, dy }, i) => tl.add(el, {
        x: [dx, 0], y: [dy, 0], scale: [.2, 1], duration: 1300, ease: "outExpo",
        opacity: { from: 0, to: 1, duration: 700, ease: "outQuad" },
      }, i === 0 ? "-=450" : "-=1120"));
      tl.add(".hero-row", { opacity: [0, 1], y: [30, 0], duration: 900 }, "-=1000")
        .add(".scroll-hint", { opacity: [0, .7], duration: 600 }, "-=400");
    });
  }

  /* ---------------------------------------------------------- click burst */
  const BC = CFG.colors || {};
  const BURST_COLORS = [BC.ink || "#F5F3EE", BC.accent || "#FF3B3B", BC.sky || "#2FC9FF", BC.sun || "#FFD23F"];
  function burst(x, y, n = 12) {
    if (!motion || !M.burst || n < 1) return;
    const parts = Array.from({ length: n }, (_, i) => {
      const p = document.createElement("span");
      p.className = "burst";
      p.style.background = BURST_COLORS[i % BURST_COLORS.length];
      document.body.appendChild(p);
      return p;
    });
    parts.forEach((p) => { p.style.left = x - 4 + "px"; p.style.top = y - 4 + "px"; });
    animate(parts, {
      x: () => utils.random(-90, 90),
      y: () => utils.random(-90, 60),
      scale: [{ to: () => utils.random(.8, 1.8, 2), duration: 200 }, { to: 0, duration: 500 }],
      duration: 700, ease: "outExpo",
      onComplete: () => parts.forEach((p) => p.remove()),
    });
  }
  document.addEventListener("click", (e) => {
    const el = e.target.closest(".btn, .copy, .lang button, .hero-mascot, .arrows button, .lb-btn, .more button, .chip");
    if (!el || e.detail === 0) return; // detail 0 = keyboard activation, keep it calm
    burst(e.clientX, e.clientY, Math.round(M.burstCount * (el.matches(".hero-mascot") ? 1.8 : 1)));
    if (motion) animate(el, { scale: [{ to: .92, duration: 90 }, { to: 1, ease: spring(300, 9) }] });
  });

  /* -------------------------------------------------------- hero mascot */
  const mascot = $(".hero-mascot");
  let spins = 0;
  mascot.addEventListener("click", () => {
    if (!motion) return;
    spins++;
    animate(mascot.querySelector("img"), {
      rotate: spins * 360, scaleX: [{ to: 1.25, duration: 150 }, { to: 1, ease: spring(220, 8) }],
      scaleY: [{ to: .8, duration: 150 }, { to: 1, ease: spring(220, 8) }], duration: 900, ease: "outBack(1.4)",
    });
  });

  /* --------------------------------------------------- pointer: magnetic */
  // The cursor itself is plain CSS (KAPLAY pixel cursors, see style.css)
  if (motion && finePointer) {
    // Magnetic buttons
    if (M.magnetic) $$(".btn, .hero-mascot, .arrows button, .copy, .to-top").forEach((el) => {
      const mag = createAnimatable(el, { x: 600, y: 600, ease: "out(4)" });
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        mag.x((e.clientX - (r.left + r.width / 2)) * M.magnetStrength * 0.93);
        mag.y((e.clientY - (r.top + r.height / 2)) * M.magnetStrength * 1.17);
      });
      el.addEventListener("pointerleave", () => { mag.x(0); mag.y(0); });
    });

    // Chips hop on hover
    $$(".chip").forEach((li) => li.addEventListener("pointerenter", () => {
      animate(li, { y: [{ to: -8, duration: 140, ease: "outQuad" }, { to: 0, ease: spring(260, 9) }] });
    }));
  }

  /* ------------------------------------------------------------ carousels */
  function setupCarousel(c) {
    const track = $(".track", c), slides = [...track.children];
    const prev = $(".prev", c), next = $(".next", c), count = $(".count", c), status = $('[role="status"]', c), markersNav = $(".markers", c);
    const n = slides.length;
    let pending = null, settled = 0;

    const markers = slides.map((s, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.addEventListener("click", () => go(i));
      markersNav.appendChild(b);
      return b;
    });
    c._refresh = () => markers.forEach((b, i) => b.setAttribute("aria-label", `${t("ui.go")} ${i + 1}`));
    c._refresh();

    const center = (s) => s.offsetLeft + s.offsetWidth / 2;
    const current = () => {
      const mid = track.scrollLeft + track.clientWidth / 2;
      let best = 0, d = Infinity;
      slides.forEach((s, i) => { const x = Math.abs(center(s) - mid); if (x < d) { d = x; best = i; } });
      return best;
    };
    const mark = (i) => {
      markers.forEach((b, k) => b.setAttribute("aria-current", String(k === i)));
      count.textContent = `${String(i + 1).padStart(2, "0")} / ${String(n).padStart(2, "0")}`;
    };
    function go(i) {
      i = (i + n) % n; // rewind loop at the ends — controls never disable
      pending = i;
      mark(i);
      track.scrollBy({ left: center(slides[i]) - (track.scrollLeft + track.clientWidth / 2), behavior: reduced ? "auto" : "smooth" });
    }
    prev.addEventListener("click", () => go((pending ?? current()) - 1));
    next.addEventListener("click", () => go((pending ?? current()) + 1));

    let raf = 0;
    track.addEventListener("scroll", () => {
      if (pending !== null) return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => mark(current()));
    }, { passive: true });
    const settle = () => {
      pending = null;
      const i = current();
      mark(i);
      if (i !== settled) { settled = i; status.textContent = `${i + 1} ${t("ui.of")} ${n}`; }
    };
    if ("onscrollend" in window) track.addEventListener("scrollend", settle);
    else { let tmr; track.addEventListener("scroll", () => { clearTimeout(tmr); tmr = setTimeout(settle, 140); }, { passive: true }); }
    mark(0);

    // Mouse drag (touch already swipes natively)
    let down = false, sx = 0, sl = 0, moved = false, suppressUntil = 0;
    // Swallow the click that ends a drag so it doesn't open the lightbox
    track.addEventListener("click", (ev) => { if (performance.now() < suppressUntil) { ev.stopPropagation(); ev.preventDefault(); } }, { capture: true });
    track.addEventListener("pointerdown", (e) => {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      down = true; moved = false; sx = e.clientX; sl = track.scrollLeft;
    });
    addEventListener("pointermove", (e) => {
      if (!down) return;
      const dx = e.clientX - sx;
      if (!moved && Math.abs(dx) > 6) { moved = true; track.classList.add("dragging"); }
      if (moved) track.scrollLeft = sl - dx;
    });
    addEventListener("pointerup", (e) => {
      if (!down) return;
      down = false;
      if (!moved) return;
      track.classList.remove("dragging");
      suppressUntil = performance.now() + 80;
      const dx = e.clientX - sx, i = current();
      // A decisive flick advances even if the nearest slide hasn't changed yet
      const flick = Math.abs(track.scrollLeft - sl) < track.clientWidth * .25 && Math.abs(dx) > 60;
      go(flick ? i + (dx < 0 ? 1 : -1) : i);
    });

    // Entrance: slides cascade in the first time the carousel is seen
    if (motion && M.carouselEntrance) {
      utils.set(slides, { opacity: 0, x: 80 });
      const io = new IntersectionObserver(([en]) => {
        if (!en.isIntersecting) return;
        io.disconnect();
        animate(slides, { opacity: 1, x: 0, duration: 1100, delay: stagger(90), ease: "outExpo",
          onComplete: () => slides.forEach((s) => { s.style.removeProperty("opacity"); s.style.removeProperty("transform"); }) });
      }, { rootMargin: "0px 0px -15% 0px" });
      io.observe(c);
    }
  }

  /* ------------------------------------------------------------- lightbox */
  const lb = $(".lightbox"), lbImg = $(".lb-stage img", lb), lbNum = $(".lb-caption b", lb), lbTxt = $(".lb-caption span", lb);
  let group = [], idx = 0, opener = null, navToken = 0;

  // Smooth scroll stays paused while any dialog (lightbox / skill modal) is open
  const syncScrollLock = () => { if (!lenis) return; document.querySelector("dialog[open]") ? lenis.stop() : lenis.start(); };

  // Cancel any running tween on the image and put it back in its resting state
  function resetImg(visible = true) {
    if (A) { utils.remove(lbImg); utils.set(lbImg, { x: 0, y: 0, scale: 1, opacity: visible ? 1 : 0 }); }
    else lbImg.style.opacity = visible ? "1" : "0";
  }

  // Load a source and resolve when it's decoded (or failed) — never leaves the image hidden
  function loadInto(src, alt) {
    return new Promise((resolve) => {
      const done = () => { lbImg.removeEventListener("load", done); lbImg.removeEventListener("error", done); resolve(); };
      lbImg.addEventListener("load", done); lbImg.addEventListener("error", done);
      lbImg.alt = alt || "";
      lbImg.src = src;
      if (lbImg.complete) done();
    });
  }

  function caption() {
    const it = group[idx];
    lbNum.textContent = `${idx + 1} / ${group.length}`;
    lbTxt.textContent = it.dataset.alt || "";
  }

  async function show(i, dir) {
    const token = ++navToken;
    idx = (i + group.length) % group.length;
    const it = group[idx];
    caption();
    if (!motion) { resetImg(true); await loadInto(it.dataset.full, it.dataset.alt); return; }
    utils.remove(lbImg);
    await new Promise((r) => animate(lbImg, { x: -60 * dir, opacity: 0, duration: 160, ease: "inQuad", onComplete: r }));
    if (token !== navToken) return;               // a newer navigation took over
    await loadInto(it.dataset.full, it.dataset.alt);
    if (token !== navToken) return;
    utils.remove(lbImg);
    animate(lbImg, { x: [60 * dir, 0], opacity: [0, 1], duration: 560, ease: "outExpo" });
  }

  async function openLightbox(trigger, from = trigger) {
    group = $$(`[data-lightbox="${trigger.dataset.lightbox}"]`);
    idx = Math.max(0, group.indexOf(trigger));
    opener = from;
    const token = ++navToken;
    const thumb = trigger.querySelector && trigger.querySelector("img");
    const fromRect = thumb && thumb.getBoundingClientRect();
    resetImg(false);                               // hidden until the new source is ready
    caption();
    if (!lb.open) lb.showModal();
    syncScrollLock();
    await loadInto(group[idx].dataset.full, group[idx].dataset.alt);
    if (token !== navToken || !lb.open) return;
    if (!motion) { resetImg(true); return; }
    const to = lbImg.getBoundingClientRect();
    if (fromRect && fromRect.width && to.width) {
      // FLIP: grow from the clicked thumbnail into place
      animate(lbImg, {
        x: [fromRect.left + fromRect.width / 2 - (to.left + to.width / 2), 0],
        y: [fromRect.top + fromRect.height / 2 - (to.top + to.height / 2), 0],
        scale: [Math.max(fromRect.width / to.width, .1), 1],
        opacity: [0, 1],
        duration: 750, ease: "outExpo",
      });
    } else {
      animate(lbImg, { scale: [.85, 1], opacity: [0, 1], duration: 600, ease: "outExpo" });
    }
  }

  // Exit animation fallback per modern-web-guidance (Firefox/Safari lack overlay transitions)
  let supportsDisplayTransition;
  function canTransitionDisplay() {
    if (supportsDisplayTransition !== undefined) return supportsDisplayTransition;
    if (!window.CSS?.supports?.("transition-behavior", "allow-discrete")) return (supportsDisplayTransition = false);
    const probe = document.createElement("div");
    probe.style.cssText = "transition: display 1s allow-discrete !important; display: block;";
    document.body.appendChild(probe);
    getComputedStyle(probe).display;
    probe.style.display = "none";
    supportsDisplayTransition = getComputedStyle(probe).display === "block";
    probe.remove();
    return supportsDisplayTransition;
  }
  // Generic animated close for any top-layer dialog (guide's closeTopLayer pattern)
  async function closeTopLayer(dialog) {
    if (!dialog.open || dialog.hasAttribute("data-closing-js")) return;
    dialog.setAttribute("data-closing-js", "");
    if (!(window.CSS?.supports?.("overlay", "auto") && canTransitionDisplay())) {
      dialog.setAttribute("data-closing", "");
      const anims = dialog.getAnimations({ subtree: true });
      if (anims.length) await Promise.race([Promise.allSettled(anims.map((a) => a.finished)), new Promise((r) => setTimeout(r, 400))]);
      dialog.removeAttribute("data-closing");
    }
    dialog.removeAttribute("data-closing-js");
    dialog.close();
  }

  async function closeLightbox() {
    if (!lb.open) return;
    navToken++;                                     // abort pending loads/slides
    if (motion) {
      utils.remove(lbImg);
      // Wait for the exit tween to really finish before closing, so it can't
      // overwrite the reset done in the "close" handler (the old bug).
      await new Promise((r) => animate(lbImg, { scale: .9, opacity: 0, duration: 220, ease: "inQuad", onComplete: r }));
    }
    await closeTopLayer(lb);
  }
  lb.addEventListener("close", () => {
    resetImg(true);
    syncScrollLock();
    opener && opener.isConnected && opener.focus({ preventScroll: true });
  });
  lb.addEventListener("cancel", (e) => { e.preventDefault(); closeLightbox(); });
  let swiped = false;
  lb.addEventListener("click", (e) => {
    if (swiped) { swiped = false; return; }
    if (e.target === lb || e.target.classList.contains("lb-stage")) closeLightbox();
  });
  $(".lb-close", lb).addEventListener("click", closeLightbox);
  $(".lb-prev", lb).addEventListener("click", () => show(idx - 1, -1));
  $(".lb-next", lb).addEventListener("click", () => show(idx + 1, 1));
  lb.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") { e.preventDefault(); show(idx + 1, 1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); show(idx - 1, -1); }
  });
  // Swipe inside the lightbox
  let lsx = null;
  lb.addEventListener("pointerdown", (e) => { lsx = e.clientX; });
  lb.addEventListener("pointerup", (e) => {
    if (lsx === null) return;
    const dx = e.clientX - lsx; lsx = null;
    if (Math.abs(dx) > 50 && !e.target.closest(".lb-btn")) { swiped = true; show(idx + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1); }
  });

  document.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-lightbox]");
    if (b) { openLightbox(b); return; }
    const m = e.target.closest("[data-more]");
    if (m) openLightbox(m.parentElement.querySelector("[data-lightbox]"), m);
  });

  /* ----------------------------------------------- skill modal (chips) */
  const sm = $(".skill-modal"), smBody = $(".skill-body", sm), smTitle = $("#skill-t", sm), smCount = $(".skill-count", sm);
  let smOpener = null;
  function openSkill(chip) {
    const tpl = $("#tpl-" + chip.dataset.skill);
    if (!tpl) return;
    smOpener = chip;
    smTitle.textContent = tpl.dataset.name;
    smCount.textContent = `${tpl.dataset.count} ${t("skill.works")}`;
    smBody.replaceChildren(tpl.content.cloneNode(true));
    $$("[data-i18n]", smBody).forEach((n) => { n.textContent = t(n.dataset.i18n); });
    $$("[data-lightbox][data-alt]", smBody).forEach((b) => b.setAttribute("aria-label", `${t("ui.zoom")}: ${b.dataset.alt}`));
    // The video only loads when its modal is opened
    $$("iframe[data-src]", smBody).forEach((f) => { f.src = f.dataset.src; });
    smBody.scrollTop = 0;
    sm.showModal();
    syncScrollLock();
    if (motion) {
      animate($$(".skill-item, .skill-video", smBody), {
        opacity: [0, 1], y: [30, 0], scale: [.94, 1], duration: 700, delay: stagger(55, { start: 120 }), ease: "outExpo",
      });
      animate(smTitle, { opacity: [0, 1], x: [-24, 0], duration: 700, ease: "outExpo" });
    }
  }
  $$("[data-skill]").forEach((c) => c.addEventListener("click", () => openSkill(c)));
  $(".skill-close", sm).addEventListener("click", () => closeTopLayer(sm));
  sm.addEventListener("cancel", (e) => { e.preventDefault(); closeTopLayer(sm); });
  sm.addEventListener("click", (e) => { if (e.target === sm) closeTopLayer(sm); }); // backdrop click
  sm.addEventListener("close", () => {
    $$("iframe", smBody).forEach((f) => f.removeAttribute("src")); // stop the video
    syncScrollLock();
    smOpener && smOpener.focus({ preventScroll: true });
  });

  /* ------------------------------------------- "more projects" hover preview */
  if (motion && finePointer) {
    const pv = $(".preview"), pvImg = $("img", pv);
    const pos = createAnimatable(pv, { x: 500, y: 500, ease: "out(3)" });
    let on = false;
    $$(".more [data-more]").forEach((b) => {
      b.addEventListener("pointerenter", () => {
        pvImg.src = b.dataset.preview;
        if (!on) { on = true; animate(pv, { opacity: 1, scale: 1, rotate: [-6, 0], duration: 500, ease: spring(200, 15) }); }
        else animate(pvImg, { scale: [1.15, 1], duration: 600, ease: "outExpo" });
      });
      b.addEventListener("pointermove", (e) => { pos.x(e.clientX + 24); pos.y(e.clientY - 120); });
    });
    $(".more ul").addEventListener("pointerleave", () => { on = false; animate(pv, { opacity: 0, scale: .6, duration: 300, ease: "outQuad" }); });
  }

  /* ------------------------------------- project grid, filters and window */
  // Full projects live in .work-store (hidden when JS runs). Opening a card moves its
  // <article> into the project window and back again on close, so carousels, reveals and
  // lightbox groups keep working untouched. Links: #trabalhos/<id> (or #<id>) open a project.
  let openFromHash = () => {};
  (() => {
    const pm = $(".project-modal"), store = $(".work-store");
    if (!pm || !store) return;
    const body = $(".pm-body", pm), count = $(".pm-count", pm), status = $("[data-filter-status]");
    const cards = $$("[data-project]");
    const pad = (n) => String(n).padStart(2, "0");
    const visibleIds = () => cards.filter((c) => !c.closest("li").hidden).map((c) => c.dataset.project);
    let current = null, opener = null;

    function mount(id, dir = 0) {
      const art = document.getElementById(id);
      if (!art || !store.contains(art) && art !== current) return false;
      if (current && current !== art) store.appendChild(current);
      body.appendChild(art); current = art;
      pm.setAttribute("aria-labelledby", id + "-t");
      const ids = visibleIds(), i = Math.max(0, ids.indexOf(id));
      count.textContent = `${pad(i + 1)} / ${pad(ids.length)}`;
      $$(".track", art).forEach((tr) => tr.scrollTo({ left: 0, behavior: "instant" }));
      body.scrollTo({ top: 0, behavior: "instant" });
      history.replaceState(null, "", "#trabalhos/" + id);
      if (motion && dir) animate(art, { opacity: [0, 1], x: [48 * dir, 0], duration: 550, ease: "outExpo" });
      return true;
    }
    function open(id, from) {
      if (!mount(id)) return false;
      opener = from || null;
      if (!pm.open) { pm.showModal(); syncScrollLock(); }
      if (motion) animate(body, { opacity: [0, 1], y: [36, 0], duration: 650, ease: "outExpo" });
      return true;
    }
    const step = (d) => {
      const ids = visibleIds(), i = ids.indexOf(current.id);
      mount(ids[(i + d + ids.length) % ids.length], d);
    };
    cards.forEach((c) => c.addEventListener("click", (e) => { e.preventDefault(); open(c.dataset.project, c); }));
    $(".pm-prev", pm).addEventListener("click", () => step(-1));
    $(".pm-next", pm).addEventListener("click", () => step(1));
    $(".pm-close", pm).addEventListener("click", () => closeTopLayer(pm));
    pm.addEventListener("cancel", (e) => { e.preventDefault(); closeTopLayer(pm); });
    pm.addEventListener("click", (e) => { if (e.target === pm) closeTopLayer(pm); }); // backdrop
    pm.addEventListener("close", () => {
      if (current) { store.appendChild(current); current = null; }
      history.replaceState(null, "", "#trabalhos");
      syncScrollLock();
      opener && opener.isConnected && opener.focus({ preventScroll: true });
    });

    openFromHash = () => {
      const m = location.hash.match(/^#(?:trabalhos\/)?([\w-]+)$/);
      if (!m || !cards.some((c) => c.dataset.project === m[1])) return;
      const card = cards.find((c) => c.dataset.project === m[1]);
      scrollToTarget($("#trabalhos"));
      open(m[1], card);
    };

    // Filters: hide the cards that don't match and announce how many remain
    const filterBtns = $$("[data-filter]");
    filterBtns.forEach((b) => b.addEventListener("click", () => {
      const f = b.dataset.filter;
      filterBtns.forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      const items = cards.map((c) => c.closest("li"));
      items.forEach((li) => { li.hidden = f !== "all" && !li.dataset.tags.split(" ").includes(f); });
      const shown = items.filter((li) => !li.hidden);
      status.textContent = `${shown.length} ${t("filter.count")}`;
      if (motion) animate(shown, { opacity: [0, 1], y: [28, 0], scale: [.96, 1], duration: 650, delay: stagger(45), ease: "outExpo" });
    }));
  })();

  /* ------------------------------------- illustrations: "show more" (mobile) */
  (() => {
    const btn = $(".gallery-toggle"), gal = $("#gallery");
    if (!btn || !gal) return;
    const label = $("[data-i18n]", btn), arrowEl = $(".arrow", btn);
    btn.addEventListener("click", () => {
      const open = gal.classList.toggle("open");
      btn.setAttribute("aria-expanded", String(open));
      label.dataset.i18n = open ? "illus.showLess" : "illus.showMore";
      label.textContent = t(label.dataset.i18n);
      arrowEl.textContent = open ? "↑" : "↓";
      if (open && motion) animate($$(":scope > :nth-child(n+7)", gal), { opacity: [0, 1], y: [30, 0], duration: 700, delay: stagger(50), ease: "outExpo" });
      if (!open) scrollToTarget($("#ilustracoes"));
    });
  })();

  /* ------------------------------------------------- floating back-to-top */
  (() => {
    const fab = $(".fab-top");
    if (!fab) return;
    fab.hidden = false;
    const sync = () => fab.classList.toggle("on", scrollY > innerHeight * 1.2);
    addEventListener("scroll", sync, { passive: true }); sync();
    fab.addEventListener("click", () => { scrollToTarget(0); $(".brand").focus({ preventScroll: true }); });
  })();

  /* ---------------------------------------------------------- copy email */
  const toast = $(".toast");
  function showToast(msg) {
    toast.textContent = msg;
    if (!A) { toast.style.opacity = 1; setTimeout(() => { toast.style.opacity = 0; }, 1800); return; }
    createTimeline()
      .add(toast, { opacity: [0, 1], y: reduced ? 0 : [20, 0], duration: 400, ease: "outExpo" })
      .add(toast, { opacity: 0, duration: 400, ease: "inQuad" }, "+=1400");
  }
  $$("[data-copy]").forEach((b) => b.addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(b.dataset.copy); showToast(t("contact.copied")); }
    catch (e) { location.href = "mailto:" + b.dataset.copy; }
  }));

  /* --------------------------------------------- peeking contact art on hover */
  if (motion) {
    const art = $(".contact-art img");
    art && art.addEventListener("pointerenter", () => animate(art, { rotate: [{ to: -6, duration: 160 }, { to: 4, duration: 160 }, { to: 0, ease: spring(200, 8) }] }));
  }

  /* ------------------------------------------------------------------ boot */
  $$("[data-year]").forEach((n) => { n.textContent = new Date().getFullYear(); });
  let saved = "pt";
  try { saved = (CFG.preview && CFG.lang) || localStorage.getItem("lang") || (navigator.language || "").slice(0, 2); } catch (e) { /* ignore */ }
  setLang(I18N[saved] ? saved : "pt");
  $$("[data-carousel]").forEach(setupCarousel);
  intro().then(() => { setupReveals(); openFromHash(); });
})();
