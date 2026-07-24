(function () {
  const factory = window.createDynamicStyleEngine;
  const root = document.documentElement;
  const body = document.body;

  if (typeof factory !== 'function' || !root || !body) {
    return;
  }

  const script = document.querySelector('script[src$="/dynamic-style.js"], script[src$="dynamic-style.js"]');
  const assetBase = script && script.src ? script.src.slice(0, script.src.lastIndexOf('/') + 1) : '/assets/';
  const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

  const hashPath = (path) => {
    let hash = 2166136261;
    for (let i = 0; i < path.length; i += 1) {
      hash ^= path.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return Math.abs(hash);
  };

  const rgb = (packed) => {
    const r = (packed >> 16) & 255;
    const g = (packed >> 8) & 255;
    const b = packed & 255;
    return `${r}, ${g}, ${b}`;
  };

  const addMqListener = (mql, handler) => {
    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', handler);
    } else if (typeof mql.addListener === 'function') {
      mql.addListener(handler);
    }
  };

  factory({
    locateFile: (path) => assetBase + path
  }).then((module) => {
    if (!module || typeof module._ui_accent_rgb !== 'function') {
      return;
    }

    body.classList.add('wasm-dynamic-style');

    const seed = hashPath(window.location.pathname || 'home');
    const state = {
      scrollY: window.scrollY || 0,
      lastScrollY: window.scrollY || 0,
      pointerX: 0.5,
      pointerY: 0.5,
      ticking: false,
      reduced: reduceMotionQuery.matches,
      viewport: 1,
      documentHeight: 1,
      styles: Object.create(null)
    };

    const refreshMetrics = () => {
      const doc = document.documentElement;
      state.viewport = window.innerHeight || 1;
      state.documentHeight = Math.max(doc.scrollHeight, body.scrollHeight, state.viewport);
    };

    const setStyle = (name, value) => {
      if (state.styles[name] !== value) {
        root.style.setProperty(name, value);
        state.styles[name] = value;
      }
    };

    const update = () => {
      const progress = module._ui_progress(state.scrollY, state.viewport, state.documentHeight);
      const velocity = state.scrollY - state.lastScrollY;
      const darkMode = body.classList.contains('dark-mode') ? 1 : 0;
      const reduced = state.reduced ? 1 : 0;
      const accent = module._ui_accent_rgb(seed, progress, state.pointerX, state.pointerY, darkMode);
      const depth = module._ui_masthead_depth(progress, state.pointerY, reduced);
      const motion = module._ui_motion_intensity(velocity, reduced);
      const focus = module._ui_focus_alpha(progress);

      setStyle('--wasm-accent-rgb', rgb(accent));
      setStyle('--wasm-progress', progress.toFixed(4));
      setStyle('--wasm-depth', depth.toFixed(4));
      setStyle('--wasm-motion', motion.toFixed(4));
      setStyle('--wasm-focus-alpha', focus.toFixed(4));

      state.lastScrollY = state.scrollY;
      state.ticking = false;
    };

    const requestUpdate = () => {
      if (document.hidden) {
        return;
      }
      state.scrollY = window.scrollY || docScrollTop();
      if (!state.ticking) {
        state.ticking = true;
        window.requestAnimationFrame(update);
      }
    };

    const docScrollTop = () => document.documentElement.scrollTop || document.body.scrollTop || 0;

    const refreshAndUpdate = () => {
      refreshMetrics();
      requestUpdate();
    };

    refreshMetrics();
    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', refreshAndUpdate, { passive: true });
    window.addEventListener('pointermove', (event) => {
      const pointerX = Math.max(0, Math.min(1, event.clientX / Math.max(1, window.innerWidth)));
      const pointerY = Math.max(0, Math.min(1, event.clientY / Math.max(1, window.innerHeight)));
      // Tiny cursor movements do not create a visually meaningful frame.
      if (Math.abs(pointerX - state.pointerX) < 0.004 && Math.abs(pointerY - state.pointerY) < 0.004) {
        return;
      }
      state.pointerX = pointerX;
      state.pointerY = pointerY;
      requestUpdate();
    }, { passive: true });

    addMqListener(reduceMotionQuery, (event) => {
      state.reduced = event.matches;
      requestUpdate();
    });

    const themeObserver = new MutationObserver(requestUpdate);
    themeObserver.observe(body, { attributes: true, attributeFilter: ['class'] });

    if (typeof ResizeObserver === 'function') {
      new ResizeObserver(refreshAndUpdate).observe(document.documentElement);
    }

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        refreshAndUpdate();
      }
    });

    requestUpdate();
  }).catch(() => {
    body.classList.add('wasm-dynamic-style-unavailable');
  });
}());
