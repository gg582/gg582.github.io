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

  // Check for saved theme in localStorage
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) {
    setTheme(savedTheme);
  } else {
    // If no saved theme, check prefers-color-scheme
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setTheme(prefersDark ? 'dark' : 'light');
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
});