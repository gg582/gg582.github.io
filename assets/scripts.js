$(function () {
  $('[data-toggle="tooltip"]').tooltip();

  const themeToggleCheckbox = document.getElementById('checkbox'); // Changed ID
  const body = document.body;
  const storageKey = 'theme';
  const colorSchemeQuery = typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : null;
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

  function setTheme(theme) {
    if (theme === 'dark') {
      body.classList.add('dark-mode');
    } else {
      body.classList.remove('dark-mode');
    }
    if (themeToggleCheckbox) {
      themeToggleCheckbox.checked = theme === 'dark';
    }
  }

  const getStoredTheme = () => localStorage.getItem(storageKey);
  const getPreferredTheme = () => (colorSchemeQuery && colorSchemeQuery.matches) ? 'dark' : 'light';
  const inlineInitialTheme = body ? body.getAttribute('data-initial-theme') : null;
  const initialTheme = getStoredTheme() || inlineInitialTheme || getPreferredTheme();

  setTheme(initialTheme);

  if (themeToggleCheckbox) {
    themeToggleCheckbox.addEventListener('change', () => {
      const newTheme = themeToggleCheckbox.checked ? 'dark' : 'light'; // Determine new theme based on checked state
      setTheme(newTheme);
      localStorage.setItem(storageKey, newTheme);
    });
  }

  addMqListener(colorSchemeQuery, (e) => {
    if (!getStoredTheme()) {
      setTheme(e.matches ? 'dark' : 'light');
    }
  });

  // New: Adaptive Masthead Text Color
  const masthead = document.querySelector('.masthead');
  const mainNav = document.getElementById('mainNav'); // Get the mainNav element
  let navBaseBgClass = null;

  const setNavBaseBgClass = (newClass) => {
    if (!mainNav) {
      return;
    }
    mainNav.classList.remove('light-bg', 'dark-bg');
    navBaseBgClass = newClass || null;
    if (!mainNav.classList.contains('navbar-sticky') && navBaseBgClass) {
      mainNav.classList.add(navBaseBgClass);
    }
  };

  if (masthead) {
    const imageUrl = getComputedStyle(masthead).backgroundImage.slice(4, -1).replace(/"/g, "");
    if (imageUrl) {
      getImageBrightness(imageUrl)
        .then(brightness => {
          if (brightness === 'light') {
            masthead.classList.add('light-bg');
            setNavBaseBgClass('light-bg'); // Apply to mainNav
          } else {
            masthead.classList.add('dark-bg');
            setNavBaseBgClass('dark-bg'); // Apply to mainNav
          }
        })
        .catch(() => {
          masthead.classList.add('dark-bg'); // Default to dark background on error
          setNavBaseBgClass('dark-bg'); // Apply to mainNav
        });
    } else {
      masthead.classList.add('dark-bg'); // Default if no image
      setNavBaseBgClass('dark-bg'); // Apply to mainNav
    }
  } else if (mainNav) {
    setNavBaseBgClass('dark-bg'); // Fallback when there is no masthead
  }

  if (mainNav) {
    const stickyThreshold = 48;
    const toggleStickyNav = () => {
      if (window.scrollY > stickyThreshold) {
        mainNav.classList.add('navbar-sticky');
        mainNav.classList.remove('light-bg', 'dark-bg');
      } else {
        mainNav.classList.remove('navbar-sticky');
        if (navBaseBgClass) {
          mainNav.classList.add(navBaseBgClass);
        }
      }
    };

    window.addEventListener('scroll', toggleStickyNav, { passive: true });
    toggleStickyNav();
  }

  initPageTransitions();
  initFeaturedLightbox();
  initNavSearch();
  initPostListSearch();
  initGlobalSearch();

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

  // Store pageshow handler reference to allow proper cleanup
  let pageShowHandler = null;

  function initPageTransitions() {
    const bodyEl = document.body;
    if (!bodyEl) {
      return;
    }

    requestAnimationFrame(() => bodyEl.classList.add('page-loaded'));

    // Handle back/forward navigation - force redraw when page is restored from cache
    if (!pageShowHandler) {
      pageShowHandler = function(event) {
        // Check if page was restored from bfcache (back/forward cache)
        let isBackForward = event.persisted;
        
        // Fallback check for back/forward navigation using Navigation Timing API
        if (!isBackForward && window.performance) {
          const navEntries = performance.getEntriesByType('navigation');
          if (navEntries.length > 0 && navEntries[0].type === 'back_forward') {
            isBackForward = true;
          }
        }
        
        if (isBackForward) {
          // Page was restored from cache - force redraw
          bodyEl.classList.remove('page-exiting');
          bodyEl.classList.add('page-loaded');
        }
      };
    }
    
    // Remove any existing listener before adding to prevent duplicates
    window.removeEventListener('pageshow', pageShowHandler);
    window.addEventListener('pageshow', pageShowHandler);

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

  function initNavSearch() {
    const searchForm = document.getElementById('navbarSearchForm');
    if (!searchForm) {
      return;
    }

    const input = document.getElementById('navbarSearchInput');
    const collectionSearchEl = document.querySelector('[data-collection-search="true"]');
    const globalSearchEl = document.querySelector('[data-global-search="true"]');

    const normalizePath = (path) => {
      const sanitized = path.replace(/index\.html$/, '');
      if (!sanitized) {
        return '/';
      }
      return sanitized.endsWith('/') ? sanitized : `${sanitized}/`;
    };

    if (globalSearchEl && typeof window !== 'undefined' && window.location && typeof window.location.pathname === 'string') {
      searchForm.setAttribute('action', normalizePath(window.location.pathname || '/'));
      searchForm.dataset.mode = 'global';
    } else if (collectionSearchEl && typeof window !== 'undefined' && window.location && typeof window.location.pathname === 'string') {
      const scopedPath = normalizePath(window.location.pathname || '/');
      searchForm.setAttribute('action', scopedPath);
      searchForm.dataset.mode = 'collection';
    } else {
      searchForm.dataset.mode = 'default';
    }

    searchForm.addEventListener('submit', (event) => {
      if (!input || !input.value.trim()) {
        event.preventDefault();
        if (input) {
          input.value = '';
          input.focus();
        }
      }
    });
  }

  function initPostListSearch() {
    const searchableContainer = document.querySelector('[data-collection-search="true"]');
    if (!searchableContainer) {
      return;
    }

    if (typeof URLSearchParams === 'undefined') {
      return;
    }

    const itemSelector = searchableContainer.dataset.searchItemSelector || '.list-item';
    const items = Array.from(searchableContainer.querySelectorAll(itemSelector));
    if (!items.length) {
      return;
    }

    const statusTargetId = searchableContainer.dataset.searchStatusTarget || 'collectionSearchStatus';
    const statusEl = document.getElementById(statusTargetId);
    const defaultStatusText = statusEl ? statusEl.textContent : '';
    const documentEndEl = document.querySelector('.document-end, .document-end-marker');
    const input = document.getElementById('navbarSearchInput');
    const params = new URLSearchParams(window.location.search);
    const initialQuery = (params.get('q') || '').trim();
    const supportsHistory = typeof window.history !== 'undefined' && typeof window.history.replaceState === 'function';
    const canUseURL = typeof window.URL === 'function';

    if (input && initialQuery) {
      input.value = initialQuery;
    }

    const syncQueryParam = (term) => {
      if (!supportsHistory || !canUseURL) {
        return;
      }
      const url = new URL(window.location.href);
      if (term) {
        url.searchParams.set('q', term);
      } else {
        url.searchParams.delete('q');
      }
      window.history.replaceState({}, '', url);
    };

    const applyFilter = (term) => {
      const trimmedTerm = term.trim();
      const normalizedTerm = trimmedTerm.replace(/\s+/g, ' ').toLowerCase();
      let matchCount = 0;

      items.forEach((item) => {
        const haystack = (item.dataset.searchText || item.textContent || '')
          .toLowerCase()
          .replace(/\s+/g, ' ');
        const isMatch = !normalizedTerm || haystack.includes(normalizedTerm);
        item.hidden = !isMatch;
        if (isMatch) {
          matchCount += 1;
        }
      });

      if (documentEndEl) {
        documentEndEl.style.display = matchCount === 0 ? 'none' : '';
      }

      if (statusEl) {
        if (!normalizedTerm) {
          statusEl.textContent = defaultStatusText || `${items.length}개의 결과가 있습니다.`;
          statusEl.dataset.state = 'idle';
        } else if (matchCount) {
          statusEl.textContent = "'" + trimmedTerm + "' 검색 결과 " + matchCount + "건을 찾았습니다.";
          statusEl.dataset.state = 'results';
        } else {
          statusEl.textContent = "'" + trimmedTerm + "' 검색 결과가 없습니다.";
          statusEl.dataset.state = 'empty';
        }
      }
    };

    if (input) {
      input.addEventListener('input', () => {
        const currentValue = input.value;
        applyFilter(currentValue);
        syncQueryParam(currentValue.trim());
      });
    }

    applyFilter(initialQuery);
  }

  function initGlobalSearch() {
    const globalRoot = document.querySelector('[data-global-search="true"]');
    if (!globalRoot) {
      return;
    }

    if (typeof window.fetch !== 'function') {
      return;
    }

    const input = document.getElementById('navbarSearchInput');
    const statusEl = document.getElementById('globalSearchStatus');
    const resultsEl = document.getElementById('globalSearchResults');
    const searchForm = document.getElementById('navbarSearchForm');
    if (!input || !statusEl || !resultsEl) {
      return;
    }

    const indexUrl = document.documentElement && document.documentElement.dataset
      ? document.documentElement.dataset.searchIndex || '/assets/search-index.json'
      : '/assets/search-index.json';
    const totalDocs = parseInt(globalRoot.getAttribute('data-total-docs'), 10) || 0;
    const initialStatus = statusEl.textContent || `총 ${totalDocs}개의 문서를 검색합니다.`;
    const fetchOptions = { cache: 'no-store' };
    let documents = [];
    let indexPromise = null;
    let hasError = false;

    const escapeHtml = (value) => {
      if (value === null || value === undefined) {
        return '';
      }
      return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    };

    const updateStatus = (text, state) => {
      statusEl.textContent = text;
      statusEl.dataset.state = state || 'idle';
    };

    const renderPlaceholder = (message, className) => {
      resultsEl.innerHTML = `<p class="${className}">${escapeHtml(message)}</p>`;
    };

    const ensureIndex = () => {
      if (documents.length || hasError) {
        return indexPromise || Promise.resolve();
      }

      if (!indexPromise) {
        updateStatus('통합 문서를 불러오는 중입니다…', 'loading');
        indexPromise = fetch(indexUrl, fetchOptions)
          .then((response) => {
            if (!response.ok) {
              throw new Error('Failed to load search index');
            }
            return response.json();
          })
          .then((data) => {
            if (Array.isArray(data)) {
              documents = data;
            } else if (Array.isArray(data.documents)) {
              documents = data.documents;
            } else {
              documents = [];
            }
            const docCount = (data && data.document_count) || documents.length;
            updateStatus(`총 ${docCount}개의 문서에서 검색합니다.`, 'ready');
            return documents;
          })
          .catch((error) => {
            console.error('Global search index error:', error);
            hasError = true;
            updateStatus('검색 인덱스를 불러오지 못했습니다.', 'error');
            renderPlaceholder('검색 인덱스를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.', 'global-search-error');
            return [];
          });
      }

      return indexPromise;
    };

    const renderResults = (matches, rawQuery) => {
      if (!matches.length) {
        renderPlaceholder(`'${rawQuery}' 검색 결과가 없습니다.`, 'global-search-empty');
        return;
      }

      const markup = matches.map((doc) => {
        const collectionLabel = escapeHtml(doc.collection || 'documents');
        const taxonomy = doc.taxonomy || {};
        const taxonomyLabel = taxonomy.subcategory || taxonomy.category || '';
        const dateLabel = doc.date ? new Date(doc.date).toISOString().split('T')[0] : '';
        const excerpt = (doc.excerpt || '').trim();
        const targetUrl = doc.url || '#';

        return `
          <article class="global-search-card">
            <div class="global-search-card__meta">
              <span class="badge">${collectionLabel}</span>
              ${taxonomyLabel ? `<span>${escapeHtml(taxonomyLabel)}</span>` : ''}
              ${dateLabel ? `<span>${escapeHtml(dateLabel)}</span>` : ''}
            </div>
            <a class="global-search-card__title" href="${escapeHtml(targetUrl)}">${escapeHtml(doc.title || targetUrl)}</a>
            ${excerpt ? `<p class="global-search-card__excerpt">${escapeHtml(excerpt)}</p>` : ''}
          </article>
        `;
      }).join('');

      resultsEl.innerHTML = markup;
    };

    const handleQuery = () => {
      const rawTerm = input.value.trim();
      if (!rawTerm) {
        resultsEl.innerHTML = '';
        updateStatus(initialStatus, 'idle');
        return;
      }

      ensureIndex()?.then(() => {
        if (hasError || !documents.length) {
          return;
        }
        const normalizedTerm = rawTerm.replace(/\s+/g, ' ').toLowerCase();
        const matches = documents.filter((doc) => {
          return (doc.search_text || '').includes(normalizedTerm);
        }).slice(0, 50);

        if (matches.length) {
          updateStatus(`'${rawTerm}' 검색 결과 ${matches.length}건을 찾았습니다.`, 'results');
        } else {
          updateStatus(`'${rawTerm}' 검색 결과가 없습니다.`, 'empty');
        }

        renderResults(matches, rawTerm);
      });
    };

    input.addEventListener('input', () => {
      handleQuery();
    });

    if (searchForm && searchForm.dataset.mode === 'global') {
      searchForm.addEventListener('submit', (event) => {
        event.preventDefault();
        handleQuery();
      });
    }
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
