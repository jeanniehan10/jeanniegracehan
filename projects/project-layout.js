(function () {
  const MOBILE_MQ = window.matchMedia('(max-width: 768px)');

  function fullSrc(img) {
    return img.dataset.fullSrc || img.dataset.desktopSrc || img.getAttribute('src') || '';
  }

  function applyResponsiveImages(root) {
    (root || document).querySelectorAll('img[data-mobile-src]').forEach((img) => {
      if (!img.dataset.desktopSrc) img.dataset.desktopSrc = img.getAttribute('src') || '';
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
      const inSequence = !!img.closest('[data-frame-sequence]');
      const inSpreadGrid = !!img.closest('.triptych-rows');
      if (i === 0 && !inSpreadGrid) {
        img.setAttribute('loading', 'eager');
        img.setAttribute('fetchpriority', 'high');
      } else {
        img.setAttribute('loading', 'lazy');
        img.removeAttribute('fetchpriority');
      }
      if (inSequence) {
        img.setAttribute('loading', 'eager');
      }
    });
  }

  applyResponsiveImages();
  applyImageLoading();
  MOBILE_MQ.addEventListener('change', () => applyResponsiveImages());

  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightboxImg');

  if (lightbox && lightboxImg) {
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
  }

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
    const n = String(index).padStart(2, '0');
    return template.replace(/\{n\}/g, n);
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

      let canvas = document.createElement('canvas');
      canvas.className = 'sequence-canvas';
      canvas.setAttribute('aria-hidden', 'true');
      figure.appendChild(canvas);

      let timer = null;
      let index = 0;
      let frames = [];
      let decoded = [];
      let loadToken = 0;

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

      function drawFrame(i) {
        const source = decoded[i];
        if (!source || !source.naturalWidth) return;
        if (canvas.width !== source.naturalWidth || canvas.height !== source.naturalHeight) {
          canvas.width = source.naturalWidth;
          canvas.height = source.naturalHeight;
        }
        const ctx = canvas.getContext('2d', { alpha: false });
        ctx.drawImage(source, 0, 0);
      }

      function loadImage(src) {
        return new Promise((resolve) => {
          const el = new Image();
          el.decoding = 'async';
          el.onload = () => resolve(el);
          el.onerror = () => resolve(el);
          el.src = src;
        });
      }

      function startTimer() {
        if (timer) clearInterval(timer);
        timer = setInterval(() => {
          if (!decoded.length) return;
          // Find next loaded frame (usually just +1 once buffer fills)
          for (let step = 1; step <= decoded.length; step += 1) {
            const next = (index + step) % decoded.length;
            if (decoded[next] && decoded[next].naturalWidth) {
              index = next;
              drawFrame(index);
              return;
            }
          }
        }, 1000 / fps);
      }

      async function restart() {
        if (timer) {
          clearInterval(timer);
          timer = null;
        }
        figure.classList.remove('is-canvas-ready');
        buildFrames();
        if (!frames.length) return;

        img.src = frames[0];
        index = 0;
        decoded = new Array(frames.length);

        const token = ++loadToken;

        // Load first frame ASAP → start playing immediately
        decoded[0] = await loadImage(frames[0]);
        if (token !== loadToken) return;
        if (!decoded[0] || !decoded[0].naturalWidth) return;

        drawFrame(0);
        figure.classList.add('is-canvas-ready');
        startTimer();

        // Kick the next couple first, then the rest in parallel
        const rest = frames.map((src, i) => {
          if (i === 0) return Promise.resolve();
          return loadImage(src).then((el) => {
            if (token !== loadToken) return;
            decoded[i] = el;
          });
        });
        // Prioritize frames 1–3 completing sooner
        await Promise.all(rest.slice(1, 4));
        await Promise.all(rest);
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

    const lightboxEl = document.getElementById('lightbox');
    if (lightboxEl) document.body.insertBefore(nav, lightboxEl);
    else document.body.appendChild(nav);
  }

  initProjectAdjacent();
})();
