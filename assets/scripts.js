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
});