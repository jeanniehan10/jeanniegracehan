(function () {
  const FINE = '(hover: hover) and (pointer: fine)';
  const CURSOR_SVG =
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16'%3E%3Ccircle cx='8' cy='8' r='8' fill='%23C8C8C8'/%3E%3C/svg%3E\") 8 8, none";
  const finePointerMq = window.matchMedia(FINE);
  let usingTouch = false;
  let lastTouchAt = 0;

  function syncMode() {
    document.documentElement.classList.toggle(
      'site-cursor-touch',
      !finePointerMq.matches || usingTouch,
    );
  }

  syncMode();
  finePointerMq.addEventListener('change', syncMode);

  let el = document.getElementById('siteCursor');
  if (!el) {
    el = document.createElement('div');
    el.className = 'site-cursor';
    el.id = 'siteCursor';
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML =
      '<span class="site-cursor__bubble">' +
      '<span class="site-cursor__label">Play With Me!</span>' +
      '</span>';
  }

  function mount() {
    if (el.parentNode) return;
    (document.body || document.documentElement).appendChild(el);
  }

  function place(x, y) {
    el.style.transform =
      'translate3d(' + x + 'px, ' + y + 'px, 0) translate(-50%, -50%)';
    try {
      sessionStorage.setItem('scx', String(x));
      sessionStorage.setItem('scy', String(y));
    } catch (_) {}
  }

  function restorePlace() {
    try {
      const x = sessionStorage.getItem('scx');
      const y = sessionStorage.getItem('scy');
      if (x != null && y != null) place(+x, +y);
    } catch (_) {}
  }

  let playHideTimer = null;
  let playShowRaf = 0;
  let playWanted = false;
  const PLAY_MS = 340;

  function setPlay(on) {
    const play = !!on;
    // Sync loop calls this every frame — only react when the desired state flips
    if (play === playWanted) return;
    playWanted = play;

    if (playHideTimer) {
      clearTimeout(playHideTimer);
      playHideTimer = null;
    }
    if (playShowRaf) {
      cancelAnimationFrame(playShowRaf);
      playShowRaf = 0;
    }

    if (play) {
      mount();
      document.documentElement.classList.add('site-cursor-play');
      // Start at 16px, then grow so the size transition actually runs
      el.classList.remove('is-play');
      playShowRaf = requestAnimationFrame(() => {
        playShowRaf = requestAnimationFrame(() => {
          playShowRaf = 0;
          if (playWanted) el.classList.add('is-play');
        });
      });
    } else {
      el.classList.remove('is-play');
      // Keep the bubble mounted through the shrink (same duration as grow)
      playHideTimer = setTimeout(() => {
        playHideTimer = null;
        if (!playWanted) {
          document.documentElement.classList.remove('site-cursor-play');
        }
      }, PLAY_MS);
    }
  }

  if (document.body) {
    mount();
    restorePlace();
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      mount();
      restorePlace();
    });
  }

  window.addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType === 'touch') return;
      if (Date.now() - lastTouchAt < 600) return;
      usingTouch = false;
      syncMode();
      place(e.clientX, e.clientY);
    },
    { passive: true },
  );

  window.addEventListener(
    'pointerdown',
    (e) => {
      if (e.pointerType === 'touch') return;
      place(e.clientX, e.clientY);
    },
    { passive: true },
  );

  window.addEventListener(
    'touchstart',
    () => {
      lastTouchAt = Date.now();
      usingTouch = true;
      syncMode();
      setPlay(false);
    },
    { passive: true },
  );

  window.addEventListener('pagehide', () => setPlay(false));

  window.siteCursor = el;
  window.setSiteCursorPlay = setPlay;

  // Expose the CSS cursor value for the inline boot style if needed
  window.SITE_CURSOR_CSS = CURSOR_SVG;
})();
