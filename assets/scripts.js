$(function () {
  $('[data-toggle="tooltip"]').tooltip();

  const themeToggleCheckbox = document.getElementById('checkbox'); // Changed ID
  const body = document.body;
  const addMqListener = (mql, handler) => {
    if (!mql || !handler) {
      return;
    }
    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', handler);
    } else if (typeof mql.addListener === 'function') {
      mql.addListener(handler);
    }
  };

  // Function to set the theme
  function setTheme(theme) {
    if (theme === 'dark') {
      body.classList.add('dark-mode');
      themeToggleCheckbox.checked = true; // Set checked property
    } else {
      body.classList.remove('dark-mode');
      themeToggleCheckbox.checked = false; // Unset checked property
    }
  }

  // Sync checkbox with current body state (applied by inline script)
  if (body.classList.contains('dark-mode')) {
    themeToggleCheckbox.checked = true;
  } else {
    themeToggleCheckbox.checked = false;
  }

  // Toggle theme on checkbox change event
  themeToggleCheckbox.addEventListener('change', () => { // Changed event listener to 'change'
    const newTheme = themeToggleCheckbox.checked ? 'dark' : 'light'; // Determine new theme based on checked state
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  });

  // Listen for changes in prefers-color-scheme
  const colorSchemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
  addMqListener(colorSchemeQuery, (e) => {
    if (!localStorage.getItem('theme')) {
      setTheme(e.matches ? 'dark' : 'light');
    }
  });

  // New: Adaptive Masthead Text Color
  const masthead = document.querySelector('.masthead');
  const mainNav = document.getElementById('mainNav'); // Get the mainNav element

  if (masthead) {
    const imageUrl = getComputedStyle(masthead).backgroundImage.slice(4, -1).replace(/"/g, "");
    if (imageUrl) {
      getImageBrightness(imageUrl)
        .then(brightness => {
          if (brightness === 'light') {
            masthead.classList.add('light-bg');
            if (mainNav) mainNav.classList.add('light-bg'); // Apply to mainNav
          } else {
            masthead.classList.add('dark-bg');
            if (mainNav) mainNav.classList.add('dark-bg'); // Apply to mainNav
          }
        })
        .catch(() => {
          masthead.classList.add('dark-bg'); // Default to dark background on error
          if (mainNav) mainNav.classList.add('dark-bg'); // Apply to mainNav
        });
    } else {
      masthead.classList.add('dark-bg'); // Default if no image
      if (mainNav) mainNav.classList.add('dark-bg'); // Apply to mainNav
    }
  }

  if (mainNav) {
    const stickyThreshold = 48;
    const toggleStickyNav = () => {
      if (window.scrollY > stickyThreshold) {
        mainNav.classList.add('navbar-sticky');
      } else {
        mainNav.classList.remove('navbar-sticky');
      }
    };

    window.addEventListener('scroll', toggleStickyNav, { passive: true });
    toggleStickyNav();
  }

  initPageTransitions();
  initFeaturedLightbox();

  /**
   * Analyzes an image URL and determines if it is 'light' or 'dark'.
   * @param {string} imageUrl The URL of the image to analyze.
   * @returns {Promise<string>} A promise that resolves to 'light' or 'dark'.
   */
  function getImageBrightness(imageUrl) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "Anonymous"; // Handle CORS
      img.src = imageUrl;
      img.onload = function () {
        const canvas = document.createElement('canvas');
        canvas.width = this.width;
        canvas.height = this.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(this, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        let totalLuminance = 0;
        const sampleRate = 10; // Check every 10th pixel for performance

        for (let i = 0; i < data.length; i += 4 * sampleRate) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          // Standard luminance calculation
          const luminance = (0.299 * r + 0.587 * g + 0.114 * b);
          totalLuminance += luminance;
        }

        const avgLuminance = totalLuminance / (data.length / (4 * sampleRate));
        
        // Threshold can be adjusted. 128 is the midpoint.
        if (avgLuminance > 128) {
          resolve('light');
        } else {
          resolve('dark');
        }
      };
      img.onerror = function () {
        reject('Could not load image');
      };
    });
  }

  function initPageTransitions() {
    const bodyEl = document.body;
    if (!bodyEl) {
      return;
    }

    requestAnimationFrame(() => bodyEl.classList.add('page-loaded'));

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (prefersReducedMotion.matches) {
      return;
    }

    const eligibleLinks = document.querySelectorAll('a[href]:not([data-transition="false"])');
    eligibleLinks.forEach(link => {
      link.addEventListener('click', event => {
        if (event.defaultPrevented) {
          return;
        }
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
          return;
        }
        if (link.target && link.target !== '_self') {
          return;
        }
        const href = link.getAttribute('href');
        if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) {
          return;
        }
        const destination = new URL(href, window.location.href);
        if (destination.origin !== window.location.origin) {
          return;
        }

        event.preventDefault();
        bodyEl.classList.add('page-exiting');
        setTimeout(() => {
          window.location.href = destination.href;
        }, 200);
      });
    });
  }

  function initFeaturedLightbox() {
    const lightbox = document.getElementById('featuredLightbox');
    if (!lightbox) {
      return;
    }

    const imageEl = lightbox.querySelector('.featured-lightbox__image');
    const captionEl = lightbox.querySelector('.featured-lightbox__caption');
    const downloadEl = lightbox.querySelector('.featured-lightbox__download');
    const closeBtn = lightbox.querySelector('.featured-lightbox__close');
    const backdrop = lightbox.querySelector('.featured-lightbox__backdrop');

    const closeLightbox = () => {
      lightbox.classList.remove('is-active');
      document.body.classList.remove('lightbox-open');
    };

    const openLightbox = (src, downloadSrc, titleText) => {
      if (imageEl) {
        imageEl.src = src;
        imageEl.alt = titleText || '확대 이미지';
      }
      if (captionEl) {
        captionEl.textContent = titleText || '미리보기';
      }
      if (downloadEl) {
        downloadEl.href = downloadSrc || src;
        const sanitized = (titleText || 'featured-image').replace(/\s+/g, '_');
        downloadEl.setAttribute('download', sanitized);
      }

      lightbox.classList.add('is-active');
      document.body.classList.add('lightbox-open');
    };

    document.querySelectorAll('.featured-thumb-link').forEach(link => {
      link.addEventListener('click', event => {
        event.preventDefault();
        const full = link.getAttribute('data-full') || link.href;
        const download = link.getAttribute('data-download') || full;
        const title = link.getAttribute('data-title') || link.getAttribute('aria-label');
        openLightbox(full, download, title);
      });
    });

    [closeBtn, backdrop].forEach(el => {
      if (!el) return;
      el.addEventListener('click', closeLightbox);
    });

    lightbox.addEventListener('click', event => {
      if (event.target === lightbox) {
        closeLightbox();
      }
    });

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && lightbox.classList.contains('is-active')) {
        closeLightbox();
      }
    });
  }

  // Ripple Effect
  const rippleSelector = '.list-item, .featured-card, .timeline-item';
  const rippleHandler = (e) => {
    const target = e.target.closest(rippleSelector);
    if (!target) {
      return;
    }

    const ripple = document.createElement('span');
    ripple.classList.add('ripple');

    const rect = target.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;

    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;

    target.appendChild(ripple);

    setTimeout(() => {
      ripple.remove();
    }, 600);
  };

  const rippleMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const bindRipple = () => document.addEventListener('click', rippleHandler);
  const unbindRipple = () => document.removeEventListener('click', rippleHandler);

  if (!rippleMotionQuery.matches) {
    bindRipple();
  }

  addMqListener(rippleMotionQuery, (event) => {
    if (event.matches) {
      unbindRipple();
    } else {
      bindRipple();
    }
  });

  // LightGallery Initialization with download support
  if (typeof lightGallery === 'function') {
    const targetContainers = document.querySelectorAll('.post-content, .page-content');
    const plugins = [];
    if (typeof lgZoom !== 'undefined') {
      plugins.push(lgZoom);
    }
    if (typeof lgDownload !== 'undefined') {
      plugins.push(lgDownload);
    }

    targetContainers.forEach(container => {
      if (!container || container.dataset.lightgallery === 'initialized') {
        return;
      }

      const images = container.querySelectorAll('img');
      if (!images.length) {
        return;
      }

      images.forEach(img => {
        if (img.closest('a')) {
          return;
        }

        const link = document.createElement('a');
        link.href = img.dataset.fullsize || img.currentSrc || img.src;
        link.classList.add('lg-inline-link');
        link.setAttribute('data-download-url', link.href);

        img.parentNode.insertBefore(link, img);
        link.appendChild(img);
      });

      const manualAnchors = container.querySelectorAll('a[data-lightbox-target="true"]');
      manualAnchors.forEach(anchor => {
        if (!anchor.getAttribute('data-download-url')) {
          anchor.setAttribute('data-download-url', anchor.href);
        }
      });

      const selector = 'a.lg-inline-link, a[data-lightbox-target="true"]';
      if (!container.querySelector(selector)) {
        return;
      }

      lightGallery(container, {
        selector,
        download: true,
        plugins,
        licenseKey: '0000-0000-000-0000',
        speed: 350,
        mobileSettings: {
          controls: true,
          showCloseIcon: true,
          download: true,
        }
      });

      container.dataset.lightgallery = 'initialized';
    });
  }

  // Reading Progress Bar Logic
  const progressBar = document.getElementById('progress-bar');
  if (progressBar) {
    const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let latestScroll = 0;
    let ticking = false;

    const applyProgress = () => {
      const doc = document.documentElement;
      const scrollHeight = doc.scrollHeight - window.innerHeight;
      const ratio = scrollHeight <= 0 ? 0 : latestScroll / scrollHeight;
      const clamped = Math.max(0, Math.min(1, ratio));
      progressBar.style.setProperty('--progress', clamped);
      progressBar.style.transform = `scaleX(${clamped})`;
      progressBar.style.width = `${clamped * 100}%`;
      ticking = false;
    };

    const requestTick = () => {
      latestScroll = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(applyProgress);
      }
    };

    const handleMotionPreference = (event) => {
      progressBar.dataset.motion = event.matches ? 'reduced' : 'default';
    };

    handleMotionPreference(reduceMotionQuery);
    addMqListener(reduceMotionQuery, handleMotionPreference);

    window.addEventListener('scroll', requestTick, { passive: true });
    window.addEventListener('resize', requestTick);
    requestTick();
  }

  // Code Copy Button Logic
  // Target both 'pre' and '.highlight' to ensure we catch all code blocks
  // In Jekyll/Rouge, usually it's div.highlight > pre.highlight > code
  // We want to attach the button to the wrapper if possible.
  
  const codeBlocks = document.querySelectorAll('div.highlight, pre.highlight');
  
  codeBlocks.forEach(block => {
    // Check if button already exists to prevent duplicates
    if (block.querySelector('.copy-code-btn')) return;
    
    // Create button
    const button = document.createElement('button');
    button.className = 'copy-code-btn';
    button.type = 'button';
    button.innerText = 'Copy';
    button.ariaLabel = 'Copy to clipboard';
    
    // Append to the block
    block.appendChild(button);
  });

  // Initialize ClipboardJS
  const clipboard = new ClipboardJS('.copy-code-btn', {
    target: function(trigger) {
      // Find the code element within the parent block
      // The button is appended to div.highlight or pre.highlight
      return trigger.parentNode.querySelector('code');
    }
  });

  clipboard.on('success', function(e) {
    e.clearSelection();
    
    // Feedback
    const button = e.trigger;
    const originalText = button.innerText;
    button.innerText = 'Copied!';
    button.classList.add('copied');
    
    setTimeout(() => {
      button.innerText = originalText;
      button.classList.remove('copied');
    }, 2000);
  });

  clipboard.on('error', function(e) {
    console.error('Action:', e.action);
    console.error('Trigger:', e.trigger);
  });
});
