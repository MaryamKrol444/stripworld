/* ==========================================================================
   StripWorld — progressive enhancement only.
   Everything here is optional: if this file fails to load, the navigation
   stays visible (html.no-js) and the page remains fully readable & indexable.
   ========================================================================== */
(function () {
  'use strict';

  var root = document.documentElement;
  root.classList.remove('no-js');

  /* ------------------------------------------------------------------
     1. Sticky promo bar -> publish its real height so body padding
        can reserve exactly the right amount of space.
     ------------------------------------------------------------------ */
  var bar = document.getElementById('stickyPromoBar');

  function syncBarHeight() {
    if (!bar) return;
    var h = Math.ceil(bar.getBoundingClientRect().height);
    if (h > 0) root.style.setProperty('--sticky-bar-h', h + 'px');
  }

  if (bar) {
    syncBarHeight();
    window.addEventListener('resize', syncBarHeight);
    window.addEventListener('orientationchange', function () {
      setTimeout(syncBarHeight, 120);
    });
    // The promo copy can reflow after a webfont or late image settles.
    window.addEventListener('load', syncBarHeight);
    if (typeof ResizeObserver === 'function') {
      new ResizeObserver(syncBarHeight).observe(bar);
    }
  }

  /* ------------------------------------------------------------------
     2. Mobile navigation — real button semantics.
        aria-expanded is kept in sync; Escape and outside clicks close it.
     ------------------------------------------------------------------ */
  var toggle = document.querySelector('.mobile-nav-toggle');
  var menu = document.getElementById('primary-nav');

  if (toggle && menu) {
    var list = menu.querySelector('.nav-menu');

    function isOpen() {
      return list && list.classList.contains('is-open');
    }

    function setOpen(open) {
      if (!list) return;
      list.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    toggle.addEventListener('click', function () {
      setOpen(!isOpen());
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen()) {
        setOpen(false);
        toggle.focus();
      }
    });

    document.addEventListener('click', function (e) {
      if (!isOpen()) return;
      if (menu.contains(e.target) || toggle.contains(e.target)) return;
      setOpen(false);
    });

    // Close after following a link (same-page anchors included).
    if (list) {
      list.addEventListener('click', function (e) {
        if (e.target.closest('a')) setOpen(false);
      });
    }

    // Never leave the mobile state applied once the collapsible nav is gone.
    // Matches the >1000px block in style.css.
    var desktop = window.matchMedia('(min-width: 1001px)');
    var onChange = function (e) { if (e.matches) setOpen(false); };
    if (desktop.addEventListener) desktop.addEventListener('change', onChange);
    else if (desktop.addListener) desktop.addListener(onChange);
  }
})();
