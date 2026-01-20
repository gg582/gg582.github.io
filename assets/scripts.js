$(function () {
  $('[data-toggle="tooltip"]').tooltip();

  const themeToggleCheckbox = document.getElementById('checkbox'); // Changed ID
  const body = document.body;

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
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
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

  // Ripple Effect
  document.addEventListener('click', function(e) {
    // Target .list-item, .featured-card, .timeline-item and their children
    const target = e.target.closest('.list-item, .featured-card, .timeline-item');
    
    if (target) {
      // Don't create ripple if clicking on a link inside (optional, but usually desired to see ripple on the item)
      // But if the link is the full item, it's fine.
      
      const ripple = document.createElement('span');
      ripple.classList.add('ripple');
      
      const rect = target.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      
      // Calculate click position relative to the element
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;
      
      ripple.style.width = ripple.style.height = `${size}px`;
      ripple.style.left = `${x}px`;
      ripple.style.top = `${y}px`;
      
      target.appendChild(ripple);
      
      setTimeout(() => {
        ripple.remove();
      }, 600);
    }
  });

  // Medium Zoom Initialization
  if (typeof mediumZoom === 'function') {
    mediumZoom('.post-content img', {
      margin: 24,
      background: body.classList.contains('dark-mode') ? '#000' : '#fff',
      scrollOffset: 0,
    });
  }

  // Reading Progress Bar Logic
  const progressBar = document.getElementById('progress-bar');
  if (progressBar) {
    window.addEventListener('scroll', () => {
      const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight || document.body.scrollHeight;
      const clientHeight = document.documentElement.clientHeight || document.body.clientHeight;
      
      const scrolled = (scrollTop / (scrollHeight - clientHeight)) * 100;
      progressBar.style.width = scrolled + '%';
    });
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