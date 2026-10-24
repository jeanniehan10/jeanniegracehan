/* Homepage: themes, work rail, index hover, info pluses. */
(function () {
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var INSET = 8;
  var COLS = 5;
  var ROWS = 3;

  function plusSize() {
    var v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--plus-size"));
    return v > 0 ? v : 6;
  }

  function grid(w, h) {
    var ps = plusSize();
    var xs = [], ys = [], out = [], i, j;
    for (i = 0; i < COLS; i++) xs.push(INSET + i * (w - INSET * 2 - ps) / (COLS - 1));
    for (j = 0; j < ROWS; j++) ys.push(INSET + j * (h - INSET * 2 - ps) / (ROWS - 1));
    for (j = 0; j < ROWS; j++) for (i = 0; i < COLS; i++) out.push({ x: xs[i], y: ys[j] });
    return out;
  }

  function placeField(field, w, h) {
    if (!field) return;
    var pts = grid(w, h);
    var nodes = field.querySelectorAll(".plus");
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].style.setProperty("--x", pts[i].x + "px");
      nodes[i].style.setProperty("--y", pts[i].y + "px");
    }
  }

  function fill(field) {
    if (!field) return;
    field.innerHTML = "";
    for (var i = 0; i < COLS * ROWS; i++) {
      var el = document.createElement("span");
      el.className = "plus";
      el.setAttribute("aria-hidden", "true");
      field.appendChild(el);
    }
  }

  var infoField = document.getElementById("infoPluses");
  fill(infoField);
  function layoutFields() {
    var info = document.getElementById("information");
    if (info) placeField(infoField, info.clientWidth, info.clientHeight);
  }
  layoutFields();
  window.addEventListener("resize", layoutFields);

  /* ---- color modes ------------------------------------------------------- */
  var root = document.documentElement;
  var themeBtns = document.querySelectorAll(".theme-btn");

  function setTheme(name) {
    if (name !== "light" && name !== "dark" && name !== "bsod") name = "light";
    root.classList.add("theme-switching");
    root.setAttribute("data-theme", name);
    themeBtns.forEach(function (btn) {
      btn.setAttribute("aria-pressed", btn.getAttribute("data-theme") === name ? "true" : "false");
    });
    try { localStorage.setItem("theme", name); } catch (e) {}
    window.setTimeout(function () {
      root.classList.remove("theme-switching");
    }, 50);
  }

  setTheme(root.getAttribute("data-theme") || "light");
  themeBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      setTheme(btn.getAttribute("data-theme"));
    });
  });

  /* ---- menu cubic hover (sensitive.work-style) --------------------------- */
  document.querySelectorAll(".bar-nav > a").forEach(function (a) {
    if (a.querySelector(".bar-link__track")) return;
    var label = (a.textContent || "").trim();
    if (!label) return;
    a.classList.add("bar-link");
    a.textContent = "";
    var track = document.createElement("span");
    track.className = "bar-link__track";
    var faceA = document.createElement("span");
    faceA.className = "bar-link__face";
    faceA.textContent = label;
    var faceB = document.createElement("span");
    faceB.className = "bar-link__face";
    faceB.setAttribute("aria-hidden", "true");
    faceB.textContent = label;
    track.appendChild(faceA);
    track.appendChild(faceB);
    a.appendChild(track);
  });

  /* ---- work rail: slow auto-scroll + drag -------------------------------- */
  var rail = document.getElementById("rail");
  var track = document.getElementById("railTrack");
  if (rail && track) {
    var originals = Array.prototype.slice.call(track.children);
    originals.forEach(function (node) {
      track.appendChild(node.cloneNode(true));
    });

    var x = 0;
    var dragging = false;
    var lastX = 0;
    var lastT = 0;
    var vx = 0;
    var RAIL_SPEED_DESKTOP = 0.22;
    var RAIL_SPEED_MOBILE = 0.62;
    var mqRail = window.matchMedia("(max-width: 820px)");
    function railAutoSpeed() {
      return mqRail.matches ? RAIL_SPEED_MOBILE : RAIL_SPEED_DESKTOP;
    }

    function loopWidth() {
      return track.scrollWidth / 2;
    }

    function wrap() {
      var w = loopWidth();
      if (w <= 1) return;
      x = ((x % w) + w) % w - w;
    }

    var lastFrame = performance.now();
    function tick(now) {
      var dt = Math.min(34, now - lastFrame);
      lastFrame = now;
      if (!dragging) {
        if (Math.abs(vx) > 0.02) {
          x += vx * dt;
          vx *= Math.pow(0.975, dt / 16.67);
        } else if (!reduce) {
          vx = 0;
          x -= railAutoSpeed() * (dt / 16.67);
        }
      }
      wrap();
      track.style.transform = "translate3d(" + x + "px,0,0)";
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);

    /* Drag on desktop and mobile. A vertical gesture stays a page scroll. */
    var pending = false;
    var dragAxis = null;
    var startX = 0;
    var startY = 0;
    rail.addEventListener("pointerdown", function (e) {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      pending = true;
      dragAxis = null;
      dragging = false;
      vx = 0;
      startX = lastX = e.clientX;
      startY = e.clientY;
      lastT = performance.now();
    });
    rail.addEventListener("pointermove", function (e) {
      if (!pending && !dragging) return;
      var mx = e.clientX - startX;
      var my = e.clientY - startY;
      if (!dragAxis) {
        if (Math.abs(mx) < 8 && Math.abs(my) < 8) return;
        dragAxis = Math.abs(mx) > Math.abs(my) ? "x" : "y";
        if (dragAxis === "y") {
          pending = false;
          return;
        }
        pending = false;
        dragging = true;
        vx = 0;
        lastX = e.clientX;
        lastT = performance.now();
        rail.classList.add("is-dragging");
        try { rail.setPointerCapture(e.pointerId); } catch (err) {}
        return;
      }
      if (!dragging) return;
      var now = performance.now();
      var dx = e.clientX - lastX;
      var dt = Math.max(8, now - lastT);
      var inst = dx / dt;
      vx = vx * 0.45 + inst * 0.55;
      x += dx;
      lastX = e.clientX;
      lastT = now;
    });
    function endDrag() {
      pending = false;
      dragAxis = null;
      if (!dragging) return;
      dragging = false;
      rail.classList.remove("is-dragging");
    }
    rail.addEventListener("pointerup", endDrag);
    rail.addEventListener("pointercancel", endDrag);
  }

  /* ---- masthead: start stretched, unstretch on scroll -------------------- */
  var mastMark = document.querySelector(".masthead__mark");
  var mastBand = document.querySelector(".masthead__band");
  var mastShell = document.querySelector(".masthead__shell");
  var mastEl = document.querySelector(".masthead");
  var mastRoot = document.documentElement;
  var mqMastMobile = window.matchMedia("(max-width: 820px)");
  function mastScaleMax() {
    var v = parseFloat(getComputedStyle(mastRoot).getPropertyValue("--mast-scale-max"));
    return v > 1 ? v : 2.55;
  }
  function mastNaturalH() {
    if (!mastBand) return 0;
    var w = mastBand.clientWidth || window.innerWidth;
    return w * (264.48 / 2720.87);
  }
  function mastTopPad() {
    return mastEl ? (parseFloat(getComputedStyle(mastEl).paddingTop) || 0) : 0;
  }
  function syncMastheadStretch() {
    if (reduce || !mastMark || !mastRoot.classList.contains("mast-stretch")) return;
    var max = mastScaleMax();
    var dist = Math.max(1, mastNaturalH() * (max - 1));
    var y = window.scrollY || document.documentElement.scrollTop || 0;
    var p = Math.min(1, Math.max(0, y / dist));
    var s = max - (max - 1) * p;
    /* Mobile: keep the stretched top inset the whole time it shrinks. */
    if (mqMastMobile.matches && mastShell && mastBand) {
      var restTop = mastTopPad();
      var target = restTop;
      if (y > dist) {
        target = Math.min(restTop, mastBand.getBoundingClientRect().bottom - mastShell.offsetHeight);
      }
      var pin = target - mastShell.getBoundingClientRect().top;
      mastMark.style.transform = "translateY(" + pin.toFixed(2) + "px) scaleY(" + s.toFixed(4) + ")";
      return;
    }
    mastMark.style.transform = "scaleY(" + s.toFixed(4) + ")";
  }
  syncMastheadStretch();
  window.addEventListener("scroll", syncMastheadStretch, { passive: true });
  window.addEventListener("touchmove", syncMastheadStretch, { passive: true });
  window.addEventListener("resize", syncMastheadStretch);
  mqMastMobile.addEventListener("change", function () {
    if (mastMark) mastMark.style.transform = "";
    syncMastheadStretch();
  });
  var lastMastY = -1;
  (function mastRaf() {
    var y = window.scrollY || document.documentElement.scrollTop || 0;
    if (y !== lastMastY) {
      lastMastY = y;
      syncMastheadStretch();
    }
    requestAnimationFrame(mastRaf);
  })();

  /* ---- keep menu bar pinned once it reaches the top ---------------------- */
  var bar = document.getElementById("bar");
  var barSpacer = null;
  var barPinY = 0;
  var mqMobile = window.matchMedia("(max-width: 820px)");

  function measureBarPin() {
    if (!bar || !barSpacer) return;
    var wasPinned = bar.classList.contains("is-pinned");
    if (wasPinned) bar.classList.remove("is-pinned");
    barSpacer.style.display = "none";
    barSpacer.style.height = "";
    barSpacer.style.marginTop = "";
    barPinY = bar.offsetTop;
    if (wasPinned) syncBarPin(true);
  }

  function syncBarPin(force) {
    if (!bar || !barSpacer) return;
    /* Mobile: bar stays fixed at bottom — no scroll-to-top behavior */
    if (mqMobile.matches) {
      bar.classList.remove("is-pinned");
      barSpacer.style.display = "none";
      barSpacer.style.height = "";
      barSpacer.style.marginTop = "";
      return;
    }
    var y = window.scrollY || 0;
    var shouldPin = y >= Math.max(0, barPinY);
    var isPinned = bar.classList.contains("is-pinned");
    if (!force && shouldPin === isPinned) return;

    if (shouldPin) {
      barSpacer.style.display = "block";
      barSpacer.style.marginTop = getComputedStyle(document.documentElement)
        .getPropertyValue("--mast-gap").trim() || "45px";
      barSpacer.style.height = Math.max(bar.offsetHeight, 28) + "px";
      bar.classList.add("is-pinned");
    } else {
      bar.classList.remove("is-pinned");
      barSpacer.style.display = "none";
      barSpacer.style.height = "";
      barSpacer.style.marginTop = "";
    }
  }

  if (bar) {
    barSpacer = document.createElement("div");
    barSpacer.className = "bar-spacer";
    barSpacer.setAttribute("aria-hidden", "true");
    bar.parentNode.insertBefore(barSpacer, bar);
    measureBarPin();
    syncBarPin(true);
    window.addEventListener("resize", function () {
      measureBarPin();
      syncBarPin(true);
    });
    window.addEventListener("scroll", function () {
      syncBarPin(false);
    }, { passive: true });
  }

  /* ---- smooth scroll (same easing as project detail pages) --------------- */
  var mqHomeMobile = window.matchMedia("(max-width: 820px)");
  var scrollCurrent = window.scrollY || 0;
  var scrollTarget = scrollCurrent;
  var scrollRaf = null;
  var scrollActive = true;
  var SCROLL_EASE = 0.095;
  /* Bar jumps (WORK / INFORMATION): faster than before, still eased */
  var NAV_SCROLL_EASE = 0.072;
  var scrollEase = SCROLL_EASE;
  var WHEEL_SCALE = 0.92;
  var TOUCH_SCALE = 0.93;

  function maxScroll() {
    var root = document.documentElement;
    var body = document.body;
    var sh = Math.max(root.scrollHeight, body ? body.scrollHeight : 0);
    return Math.max(0, sh - window.innerHeight);
  }
  function mastStretchDist() {
    return Math.max(1, mastNaturalH() * (mastScaleMax() - 1));
  }
  function clampScroll(v) {
    return Math.max(0, Math.min(maxScroll(), v));
  }
  function startSmoothTick() {
    if (scrollRaf == null && scrollActive && !reduce) {
      scrollRaf = requestAnimationFrame(tickScroll);
    }
  }
  function setScrollTarget(y, ease) {
    scrollEase = ease || SCROLL_EASE;
    scrollTarget = clampScroll(y);
    startSmoothTick();
  }
  function tickScroll() {
    if (!scrollActive || reduce) {
      scrollRaf = null;
      return;
    }
    var delta = scrollTarget - scrollCurrent;
    if (Math.abs(delta) < 0.35) {
      scrollCurrent = scrollTarget;
      window.scrollTo(0, scrollCurrent);
      scrollEase = SCROLL_EASE;
      scrollRaf = null;
      syncBarPin(false);
      syncMastheadStretch();
      return;
    }
    scrollCurrent += delta * scrollEase;
    window.scrollTo(0, scrollCurrent);
    syncBarPin(false);
    syncMastheadStretch();
    scrollRaf = requestAnimationFrame(tickScroll);
  }

  if (!reduce) {
    window.addEventListener("wheel", function (e) {
      if (e.ctrlKey) return;
      if (e.target && e.target.closest && e.target.closest(".rail.is-dragging")) return;
      e.preventDefault();
      setScrollTarget(scrollTarget + e.deltaY * WHEEL_SCALE);
    }, { passive: false });

    window.addEventListener("scroll", function () {
      if (scrollRaf != null) return;
      scrollCurrent = window.scrollY || 0;
      scrollTarget = scrollCurrent;
    }, { passive: true });

    var touchY = 0;
    var touchStartX = 0;
    var touchStartY = 0;
    var touchAxis = null;
    var touchOnRail = false;
    var touchActive = false;
    var touchCustom = false;
    document.addEventListener("touchstart", function (e) {
      if (!e.touches || !e.touches[0]) return;
      touchActive = true;
      touchAxis = null;
      touchStartX = e.touches[0].clientX;
      touchStartY = touchY = e.touches[0].clientY;
      touchOnRail = !!(e.target && e.target.closest && e.target.closest("#rail"));
      /* Ease only while the masthead is still contracting; after that, native scroll. */
      touchCustom = mqHomeMobile.matches && (window.scrollY || 0) < mastStretchDist();
      scrollCurrent = window.scrollY || 0;
      scrollTarget = scrollCurrent;
    }, { passive: true });
    document.addEventListener("touchmove", function (e) {
      if (!touchActive || !touchCustom || !e.touches || !e.touches[0]) return;
      var t = e.touches[0];
      if (touchOnRail && !touchAxis) {
        var adx = Math.abs(t.clientX - touchStartX);
        var ady = Math.abs(t.clientY - touchStartY);
        if (adx < 8 && ady < 8) return;
        touchAxis = adx > ady ? "x" : "y";
      }
      if (touchOnRail && (touchAxis === "x" || (rail && rail.classList.contains("is-dragging")))) return;
      e.preventDefault();
      var dy = touchY - t.clientY;
      touchY = t.clientY;
      setScrollTarget(scrollTarget + dy * TOUCH_SCALE);
    }, { passive: false });
    document.addEventListener("touchend", function () { touchActive = false; touchAxis = null; touchCustom = false; }, { passive: true });
    document.addEventListener("touchcancel", function () { touchActive = false; touchAxis = null; touchCustom = false; }, { passive: true });
  }

  /* ---- scroll reveal (same as project detail pages) ---------------------- */
  (function initHomeReveal() {
    var REVEAL_SELECTOR = [
      ".masthead",
      ".rail",
      ".manifesto",
      ".index-title",
      ".work",
      ".info-about",
      ".info-exp",
      ".info-logo",
      ".info-status"
    ].join(", ");

    var targets = Array.prototype.slice.call(document.querySelectorAll(REVEAL_SELECTOR));
    document.querySelectorAll(".reveal").forEach(function (el) {
      if (targets.indexOf(el) === -1) targets.push(el);
    });

    var showAll = function () {
      targets.forEach(function (el) { el.classList.add("is-revealed"); });
      document.documentElement.classList.remove("home-reveal");
    };

    targets.forEach(function (el) { el.classList.add("reveal"); });

    /* Still animate on desktop touch hybrids; only skip for reduced-motion / no IO */
    if (reduce || !("IntersectionObserver" in window)) {
      showAll();
      return;
    }
    if (!targets.length) return;

    var io = new IntersectionObserver(function (entries) {
      entries.filter(function (entry) { return entry.isIntersecting; })
        .forEach(function (entry, i) {
          entry.target.style.setProperty("--reveal-delay", Math.min(i, 3) * 80 + "ms");
          entry.target.classList.add("is-revealed");
          io.unobserve(entry.target);
        });
    }, { rootMargin: "0px 0px -6% 0px", threshold: 0.01 });

    /* Wait two frames so the hidden state paints before easing in */
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        targets.forEach(function (n) { io.observe(n); });
      });
    });

    /* Failsafe: never leave the page invisible if IO stalls */
    window.setTimeout(function () {
      targets.forEach(function (el) {
        if (!el.classList.contains("is-revealed")) el.classList.add("is-revealed");
      });
    }, 2800);
  })();

  var CONTACT_EMAIL = "jeanniehan10@gmail.com";

  function copyContactEmail() {
    function fallback() {
      return new Promise(function (resolve, reject) {
        var ta = document.createElement("textarea");
        ta.value = CONTACT_EMAIL;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        try {
          if (document.execCommand("copy")) resolve();
          else reject(new Error("copy failed"));
        } catch (err) {
          reject(err);
        } finally {
          document.body.removeChild(ta);
        }
      });
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(CONTACT_EMAIL).catch(fallback);
    }
    return fallback();
  }

  function showEmailCopied(anchor) {
    var old = document.querySelector(".email-copied");
    if (old) old.remove();
    var tip = document.createElement("span");
    tip.className = "email-copied";
    tip.setAttribute("role", "status");
    tip.textContent = "Email Copied!";
    document.body.appendChild(tip);
    var rect = anchor.getBoundingClientRect();
    var tipW = tip.offsetWidth;
    var bar = anchor.closest(".bar");
    var barRect = bar ? bar.getBoundingClientRect() : rect;
    var center = rect.left + rect.width / 2;
    var left = Math.max(8 + tipW / 2, Math.min(center, window.innerWidth - 8 - tipW / 2));
    if (barRect.top > window.innerHeight * 0.5) {
      tip.style.left = left + "px";
      tip.style.top = barRect.top + "px";
    } else if (window.innerWidth - rect.right >= tipW + 16) {
      tip.classList.add("is-beside");
      tip.style.left = (rect.right + 10) + "px";
      tip.style.top = (rect.top + rect.height / 2) + "px";
    } else {
      tip.classList.add("is-below");
      tip.style.left = left + "px";
      tip.style.top = (barRect.bottom + 8) + "px";
    }
    requestAnimationFrame(function () { tip.classList.add("is-on"); });
    window.setTimeout(function () {
      tip.classList.remove("is-on");
      window.setTimeout(function () { if (tip.parentNode) tip.remove(); }, 180);
    }, 1400);
  }

  document.addEventListener("click", function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute("href").slice(1);
    if (id === "contact") {
      e.preventDefault();
      copyContactEmail().then(function () {
        showEmailCopied(a);
      }).catch(function () {});
      return;
    }
    var el = id && document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    var y = el.getBoundingClientRect().top + window.scrollY;
    var ease = a.closest(".bar-nav") ? NAV_SCROLL_EASE : SCROLL_EASE;
    if (reduce) window.scrollTo(0, y);
    else setScrollTarget(y, ease);
  });

  /* ---- information clock -------------------------------------------------- */
  (function initInfoClock() {
    var timeEl = document.getElementById("infoTime");
    if (!timeEl) return;
    function paint() {
      var now = new Date();
      timeEl.textContent = now.toLocaleTimeString("en-US", {
        timeZone: "America/New_York",
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit"
      });
    }
    paint();
    window.setInterval(paint, 1000);
  })();

  /* Keep the mobile status line on one row, as large as the screen allows. */
  (function fitInfoStatus() {
    var el = document.querySelector(".info-status");
    var mq = window.matchMedia("(max-width: 820px)");
    if (!el) return;
    function fit() {
      if (!mq.matches) {
        el.style.fontSize = "";
        return;
      }
      var size = Math.min(10, Math.max(8, window.innerWidth * 0.017));
      el.style.fontSize = size + "px";
      var guard = 0;
      while (el.scrollWidth > el.clientWidth + 1 && size > 6.5 && guard < 40) {
        size = Math.round((size - 0.25) * 100) / 100;
        el.style.fontSize = size + "px";
        guard++;
      }
    }
    fit();
    window.addEventListener("resize", fit);
  })();
})();
