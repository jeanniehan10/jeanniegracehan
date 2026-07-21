(function () {
  const MOBILE_MQ = window.matchMedia('(max-width: 768px)');

  function fullSrc(img) {
    return img.dataset.fullSrc || img.dataset.desktopSrc || img.getAttribute('src') || '';
  }

  function applyResponsiveImages(root) {
    (root || document).querySelectorAll('img[data-mobile-src]').forEach((img) => {
      if (!img.dataset.desktopSrc) img.dataset.desktopSrc = img.getAttribute('src') || '';
      // Keep lightbox master if provided; otherwise desktop display file
      if (!img.dataset.fullSrc) img.dataset.fullSrc = img.dataset.desktopSrc;
      const next = MOBILE_MQ.matches && img.dataset.mobileSrc ? img.dataset.mobileSrc : img.dataset.desktopSrc;
      if (img.getAttribute('src') !== next) img.setAttribute('src', next);
    });
  }

  function applyImageLoading(root) {
    const scope = root || document;
    const imgs = [...scope.querySelectorAll('img')];
    imgs.forEach((img, i) => {
      if (!img.hasAttribute('decoding')) img.setAttribute('decoding', 'async');
      // First couple of images: eager (LCP). Everything else lazy.
      if (i < 2) {
        if (!img.hasAttribute('loading')) img.setAttribute('loading', 'eager');
        if (i === 0) img.setAttribute('fetchpriority', 'high');
      } else if (!img.hasAttribute('loading')) {
        img.setAttribute('loading', 'lazy');
      }
    });
  }

  applyResponsiveImages();
  applyImageLoading();
  MOBILE_MQ.addEventListener('change', () => applyResponsiveImages());

  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightboxImg');
  if (!lightbox || !lightboxImg) return;

  function openLightbox(src, alt) {
    lightboxImg.src = src;
    lightboxImg.alt = alt || '';
    lightbox.classList.add('is-open');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    lightbox.classList.remove('is-open');
    lightbox.setAttribute('aria-hidden', 'true');
    lightboxImg.removeAttribute('src');
    document.body.style.overflow = '';
  }

  document.querySelectorAll('[data-zoomable]').forEach((img) => {
    img.addEventListener('click', () => openLightbox(fullSrc(img), img.alt));
  });

  lightbox.addEventListener('click', () => closeLightbox());
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && lightbox.classList.contains('is-open')) closeLightbox();
  });

  const tracks = [...document.querySelectorAll('.triptych__track')].filter(
    (track) => !track.closest('.triptych-rows')
  );
  const SLIDE_MS = 3000;

  function createSlideshow(track) {
    const slides = [...track.querySelectorAll('figure:not(.triptych__clone)')];
    let slideIndex = 0;
    let slideTimer = null;
    let cloneSlide = null;
    let realSlideCount = 0;

    function goToSlide(i, animate) {
      track.style.transition = animate ? '' : 'none';
      track.style.transform = `translate3d(-${i * 100}%, 0, 0)`;
      if (!animate) {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            track.style.transition = '';
          });
        });
      }
    }

    function teardownInfiniteTrack() {
      if (cloneSlide) {
        cloneSlide.remove();
        cloneSlide = null;
      }
      realSlideCount = 0;
      slideIndex = 0;
      track.style.transition = '';
      track.style.transform = '';
    }

    function setupInfiniteTrack() {
      teardownInfiniteTrack();
      if (slides.length < 2) return;
      realSlideCount = slides.length;
      cloneSlide = slides[0].cloneNode(true);
      cloneSlide.classList.add('triptych__clone');
      cloneSlide.setAttribute('aria-hidden', 'true');
      applyResponsiveImages(cloneSlide);
      track.appendChild(cloneSlide);
    }

    track.addEventListener('transitionend', (e) => {
      if (e.propertyName !== 'transform' || !MOBILE_MQ.matches || !cloneSlide) return;
      if (slideIndex === realSlideCount) {
        slideIndex = 0;
        goToSlide(0, false);
      }
    });

    function clearSlideshow() {
      if (slideTimer) {
        clearInterval(slideTimer);
        slideTimer = null;
      }
    }

    function startSlideshow() {
      clearSlideshow();
      teardownInfiniteTrack();
      applyResponsiveImages(track);
      if (!MOBILE_MQ.matches || slides.length < 2) return;
      setupInfiniteTrack();
      slideIndex = 0;
      goToSlide(0, false);
      slideTimer = setInterval(() => {
        slideIndex += 1;
        goToSlide(slideIndex, true);
      }, SLIDE_MS);
    }

    return { startSlideshow };
  }

  const slideshows = tracks.map(createSlideshow);

  function startAllSlideshows() {
    slideshows.forEach((slideshow) => slideshow.startSlideshow());
  }

  startAllSlideshows();
  MOBILE_MQ.addEventListener('change', startAllSlideshows);

  function frameSrc(template, index) {
    return template.replace('{n}', String(index));
  }

  function parseFrameList(raw) {
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length) return parsed.map(String);
    } catch (_) {
      /* fall through — allow comma / newline lists */
    }
    const list = String(raw).split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
    return list.length ? list : null;
  }

  function initFrameSequences() {
    document.querySelectorAll('[data-frame-sequence]').forEach((figure) => {
      const img = figure.querySelector('img');
      if (!img) return;

      // Clean up any prior canvas experiment
      figure.querySelectorAll('canvas.sequence-canvas').forEach((el) => el.remove());
      figure.classList.remove('is-canvas-ready');

      const fps = Number(figure.dataset.fps) || 8;
      const explicitList = parseFrameList(
        figure.getAttribute('data-frame-list') || figure.dataset.frameList || ''
      );
      const count = Number(figure.dataset.frames) || 0;
      const desktopTemplate = figure.dataset.srcDesktop || '';
      const mobileTemplate = figure.dataset.srcMobile || desktopTemplate;
      if (!explicitList && (!count || !desktopTemplate)) return;

      let timer = null;
      let index = 0;
      let frames = [];
      const cache = new Map();

      function activeTemplate() {
        return MOBILE_MQ.matches && mobileTemplate ? mobileTemplate : desktopTemplate;
      }

      function buildFrames() {
        if (explicitList) {
          frames = explicitList.slice();
          return;
        }
        const template = activeTemplate();
        frames = [];
        for (let i = 1; i <= count; i += 1) frames.push(frameSrc(template, i));
      }

      function preload(src) {
        if (!src || cache.has(src)) return cache.get(src);
        const preloadImg = new Image();
        preloadImg.decoding = 'async';
        preloadImg.src = src;
        cache.set(src, preloadImg);
        return preloadImg;
      }

      function showFrame(i) {
        const src = frames[i];
        if (!src) return;
        preload(src);
        if (img.getAttribute('src') !== src) img.setAttribute('src', src);
      }

      function restart() {
        if (timer) {
          clearInterval(timer);
          timer = null;
        }
        buildFrames();
        if (!frames.length) return;
        index = 0;
        showFrame(0);
        // Warm the next few frames; don't block playback on the full set
        frames.slice(0, Math.min(frames.length, 4)).forEach(preload);
        frames.forEach((src, i) => {
          if (i >= 4) preload(src);
        });
        timer = setInterval(() => {
          index = (index + 1) % frames.length;
          showFrame(index);
          preload(frames[(index + 1) % frames.length]);
        }, 1000 / fps);
      }

      restart();
      MOBILE_MQ.addEventListener('change', restart);
    });
  }

  initFrameSequences();

  const PROJECT_ORDER = [
    'CLUTTER/clutter.html',
    'NSNB/new-school-new-books.html',
    'COP/pomegranates.html',
    'GESTALT/gestalt.html',
    'BUSINESSCARD/business-card.html',
    'FORCE!/force.html',
  ];

  function initProjectAdjacent() {
    const path = decodeURIComponent(window.location.pathname.replace(/\\/g, '/'));
    const idx = PROJECT_ORDER.findIndex((entry) => (
      path.endsWith('/' + entry) || path.endsWith(entry)
    ));
    if (idx < 0) return;

    const prev = idx > 0 ? PROJECT_ORDER[idx - 1] : null;
    const next = idx < PROJECT_ORDER.length - 1 ? PROJECT_ORDER[idx + 1] : null;

    const nav = document.createElement('nav');
    nav.className = 'project-adjacent';
    nav.setAttribute('aria-label', 'Adjacent projects');

    if (prev) {
      const a = document.createElement('a');
      a.className = 'project-adjacent__prev';
      a.href = '../' + prev;
      a.textContent = '< Previous';
      a.setAttribute('aria-label', 'Previous project');
      nav.appendChild(a);
    } else {
      const spacer = document.createElement('span');
      spacer.className = 'project-adjacent__spacer';
      spacer.setAttribute('aria-hidden', 'true');
      nav.appendChild(spacer);
    }

    if (next) {
      const a = document.createElement('a');
      a.className = 'project-adjacent__next';
      a.href = '../' + next;
      a.textContent = 'Next >';
      a.setAttribute('aria-label', 'Next project');
      nav.appendChild(a);
    } else {
      const spacer = document.createElement('span');
      spacer.className = 'project-adjacent__spacer';
      spacer.setAttribute('aria-hidden', 'true');
      nav.appendChild(spacer);
    }

    const lightbox = document.getElementById('lightbox');
    if (lightbox) document.body.insertBefore(nav, lightbox);
    else document.body.appendChild(nav);
  }

  initProjectAdjacent();
})();
