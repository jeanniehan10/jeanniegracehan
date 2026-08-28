(function () {
  function trailPalette() {
    const raw = document.body?.dataset?.trailColors;
    if (!raw) return null;
    const colors = raw.split(',').map((c) => c.trim()).filter(Boolean);
    return colors.length ? colors : null;
  }

  function asterisksMode() {
    return document.body?.hasAttribute('data-trail-asterisks');
  }

  function wrapWords(el, palette, counter) {
    const useAsterisks = asterisksMode();
    const nodes = [...el.childNodes];
    for (const node of nodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        const parts = node.textContent.split(/(\s+)/);
        const frag = document.createDocumentFragment();
        for (const part of parts) {
          if (!part) continue;
          if (/^\s+$/.test(part)) {
            frag.appendChild(document.createTextNode(part));
          } else {
            const span = document.createElement('span');
            span.className = 'trail-word';
            if (useAsterisks) {
              const text = document.createElement('span');
              text.className = 'trail-word__text';
              text.textContent = part;
              const mask = document.createElement('span');
              mask.className = 'trail-word__mask';
              mask.setAttribute('aria-hidden', 'true');
              mask.textContent = '*'.repeat([...part].length);
              span.append(text, mask);
            } else {
              span.textContent = part;
            }
            if (palette) {
              span.style.setProperty('--trail-lit', palette[counter.i % palette.length]);
              counter.i += 1;
            }
            frag.appendChild(span);
          }
        }
        node.replaceWith(frag);
      } else if (node.nodeType === Node.ELEMENT_NODE && node.tagName !== 'BR' && node.tagName !== 'A') {
        wrapWords(node, palette, counter);
      }
    }
  }

  function markProjectCopy() {
    document.querySelectorAll([
      '.copy p:not(.no-trail)',
      '.project-masthead__title',
      '.project-masthead__meta p',
    ].join(', ')).forEach((el) => {
      el.classList.add('text-trail');
    });
  }

  function lightWord(word) {
    if (!word) return;
    if (word._asteriskRestoreTimer) {
      clearTimeout(word._asteriskRestoreTimer);
      word._asteriskRestoreTimer = null;
    }
    word.classList.add('is-lit');
  }

  function unlightWord(word) {
    if (!word) return;
    if (asterisksMode()) {
      if (word._asteriskRestoreTimer) clearTimeout(word._asteriskRestoreTimer);
      // Hold asterisks, then snap the whole word back (no fade)
      word._asteriskRestoreTimer = setTimeout(() => {
        word._asteriskRestoreTimer = null;
        word.classList.remove('is-lit');
      }, 2000);
      return;
    }
    word.classList.remove('is-lit');
  }

  function wordFromPoint(clientX, clientY) {
    const el = document.elementFromPoint(clientX, clientY);
    return el?.closest?.('.trail-word') || null;
  }

  function bindTrail(block) {
    if (block.dataset.trailReady) return;
    block.dataset.trailReady = '1';

    block.addEventListener('mouseover', (e) => {
      const word = e.target.closest('.trail-word');
      if (!word || !block.contains(word)) return;
      lightWord(word);
    });
    block.addEventListener('mouseout', (e) => {
      const word = e.target.closest('.trail-word');
      if (!word || !block.contains(word)) return;
      if (e.relatedTarget && word.contains(e.relatedTarget)) return;
      unlightWord(word);
    });
  }

  function initTouchTrail() {
    if (document.documentElement.dataset.trailTouchReady) return;
    document.documentElement.dataset.trailTouchReady = '1';

    let active = null;

    function syncFromTouch(touch) {
      if (!touch) return;
      const word = wordFromPoint(touch.clientX, touch.clientY);
      if (word === active) return;
      if (active) unlightWord(active);
      active = word;
      if (active) lightWord(active);
    }

    document.addEventListener('touchstart', (e) => {
      syncFromTouch(e.touches[0]);
    }, { passive: true });

    document.addEventListener('touchmove', (e) => {
      syncFromTouch(e.touches[0]);
    }, { passive: true });

    document.addEventListener('touchend', () => {
      if (active) unlightWord(active);
      active = null;
    });
    document.addEventListener('touchcancel', () => {
      if (active) unlightWord(active);
      active = null;
    });
  }

  function initTrail() {
    // No word-trail / asterisk hover on phones — touch was stacking both layers
    if (window.matchMedia('(max-width: 768px)').matches) return;

    markProjectCopy();
    const palette = trailPalette();
    const counter = { i: 0 };
    document.querySelectorAll('.text-trail').forEach((block) => {
      if (block.dataset.trailReady) return;
      wrapWords(block, palette, counter);
      bindTrail(block);
    });
    initTouchTrail();
  }

  window.initTextTrail = initTrail;
  initTrail();
})();
