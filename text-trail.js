(function () {
  const mq = window.matchMedia('(min-width: 769px) and (hover: hover)');

  function trailPalette() {
    const raw = document.body?.dataset?.trailColors;
    if (!raw) return null;
    const colors = raw.split(',').map((c) => c.trim()).filter(Boolean);
    return colors.length ? colors : null;
  }

  function wrapWords(el, palette, counter) {
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
            span.textContent = part;
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
      '.copy-lede .meta',
      '.project-masthead__title',
      '.project-masthead__meta p',
    ].join(', ')).forEach((el) => {
      el.classList.add('text-trail');
    });
  }

  function initTrail() {
    if (!mq.matches) return;
    markProjectCopy();
    const palette = trailPalette();
    const counter = { i: 0 };
    document.querySelectorAll('.text-trail').forEach((block) => {
      if (block.dataset.trailReady) return;
      wrapWords(block, palette, counter);
      block.dataset.trailReady = '1';
      block.addEventListener('mouseover', (e) => {
        const word = e.target.closest('.trail-word');
        if (!word || !block.contains(word)) return;
        word.classList.add('is-lit');
      });
      block.addEventListener('mouseout', (e) => {
        const word = e.target.closest('.trail-word');
        if (!word || !block.contains(word)) return;
        if (e.relatedTarget && word.contains(e.relatedTarget)) return;
        word.classList.remove('is-lit');
      });
    });
  }

  window.initTextTrail = initTrail;
  initTrail();
  mq.addEventListener('change', initTrail);
})();
