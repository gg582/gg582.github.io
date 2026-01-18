$(function () {
  $('[data-toggle="tooltip"]').tooltip();

  const themeToggle = document.getElementById('theme-toggle');
  const body = document.body;

  // Function to set the theme
  function setTheme(theme) {
    if (theme === 'dark') {
      body.classList.add('dark-mode');
      themeToggle.textContent = 'Dark';
    } else {
      body.classList.remove('dark-mode');
      themeToggle.textContent = 'Light';
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

  // Toggle theme on button click
  themeToggle.addEventListener('click', () => {
    const currentTheme = body.classList.contains('dark-mode') ? 'dark' : 'light';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
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
  if (masthead) {
    const imageUrl = getComputedStyle(masthead).backgroundImage.slice(4, -1).replace(/"/g, "");
    if (imageUrl) {
      getImageBrightness(imageUrl)
        .then(brightness => {
          if (brightness === 'light') {
            masthead.classList.add('light-bg');
          } else {
            masthead.classList.add('dark-bg');
          }
        })
        .catch(() => {
          masthead.classList.add('dark-bg'); // Default to dark background on error
        });
    } else {
      masthead.classList.add('dark-bg'); // Default if no image
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