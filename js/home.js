/* Home page: theme toggle, active nav, fade-ins, "( scroll )" scramble. */
(function () {
  "use strict";
  var doc = document.documentElement;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* theme toggle (logo) — remembered across pages in localStorage */
  var logo = document.getElementById("logo");
  logo.addEventListener("click", function () {
    var next = doc.dataset.theme === "light" ? "dark" : "light";
    doc.dataset.theme = next;
    try { localStorage.setItem("theme", next); } catch (e) { /* ignore */ }
  });

  /* in-page links: start slow for a moment, then zoom to the section */
  function easeScroll(targetY, duration) {
    var startY = window.scrollY, dist = targetY - startY, t0 = null;
    if (reduce || Math.abs(dist) < 2) { window.scrollTo(0, targetY); return; }
    function ease(t) { // ease-in-out expo: barely moves at first, then zooms, then snaps in
      if (t <= 0) return 0;
      if (t >= 1) return 1;
      return t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2;
    }
    function step(ts) {
      if (t0 === null) t0 = ts;
      var p = Math.min(1, (ts - t0) / duration);
      window.scrollTo(0, startY + dist * ease(p));
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  document.addEventListener("click", function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute("href").slice(1);
    var target = id ? document.getElementById(id) : document.body;
    if (!target) return;
    e.preventDefault();
    var max = document.documentElement.scrollHeight - window.innerHeight;
    easeScroll(Math.min(max, id === "top" ? 0 : target.offsetTop), 1500);
    if (history.replaceState) history.replaceState(null, "", "#" + id);
  });

  /* nav: grey out the section you are in */
  var links = Array.prototype.slice.call(document.querySelectorAll(".hdr-nav a"));
  var sections = links.map(function (a) { return document.querySelector(a.getAttribute("href")); });
  function setActive() {
    var y = window.scrollY + window.innerHeight * 0.4;
    var current = null;
    sections.forEach(function (s, i) { if (s && s.offsetTop <= y) current = i; });
    links.forEach(function (a, i) { a.classList.toggle("is-active", i === current); });
  }
  window.addEventListener("scroll", setActive, { passive: true });
  window.addEventListener("resize", setActive);
  setActive();

  /* fade-ins */
  var items = document.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window) || reduce) {
    items.forEach(function (n) { n.classList.add("is-in"); });
  } else {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -8% 0px" });
    items.forEach(function (n) { io.observe(n); });
  }

  /* "( scroll )" letter scramble, like the reference's hint */
  var hint = document.getElementById("scrollWord");
  if (hint && !reduce) {
    var word = hint.textContent, chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    function scramble() {
      var frame = 0, total = 14;
      var t = setInterval(function () {
        frame++;
        hint.textContent = word.split("").map(function (c, i) {
          return i < (frame / total) * word.length ? c : chars[Math.floor(Math.random() * 26)];
        }).join("");
        if (frame >= total) { clearInterval(t); hint.textContent = word; }
      }, 55);
    }
    setInterval(scramble, 4000);
    setTimeout(scramble, 800);
  }
})();
