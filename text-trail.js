(function () {
  const mq = window.matchMedia('(min-width: 769px) and (hover: hover)');

  function wrapWords(el) {
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
            frag.appendChild(span);
          }
        }
        node.replaceWith(frag);
      } else if (node.nodeType === Node.ELEMENT_NODE && node.tagName !== 'BR') {
        wrapWords(node);
      }
    }
  }

  function bindTrail(block) {
    if (block.dataset.trailReady) return;
    wrapWords(block);
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
  }

  function markProjectCopy() {
    document.querySelectorAll('.copy p:not(.no-trail), .copy-lede .meta').forEach((el) => {
      el.classList.add('text-trail');
    });
  }

  function initTrail() {
    if (!mq.matches) return;
    markProjectCopy();
    document.querySelectorAll('.text-trail').forEach(bindTrail);
  }

  window.initTextTrail = initTrail;
  initTrail();
  mq.addEventListener('change', initTrail);
})();
