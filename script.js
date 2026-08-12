(function () {
  const root = document.documentElement;
  const toggle = document.querySelector('.theme-toggle');
  if (!toggle) return;

  const systemDark = window.matchMedia('(prefers-color-scheme: dark)');
  const storedTheme = localStorage.getItem('balkan-theme');
  if (storedTheme === 'light' || storedTheme === 'dark') {
    root.dataset.theme = storedTheme;
  }

  function activeTheme() {
    return root.dataset.theme || (systemDark.matches ? 'dark' : 'light');
  }

  function updateLabel() {
    const nextTheme = activeTheme() === 'dark' ? 'light' : 'dark';
    toggle.setAttribute('aria-label', `Switch to ${nextTheme} theme`);
    toggle.setAttribute('title', `Switch to ${nextTheme} theme`);
  }

  toggle.addEventListener('click', function () {
    const nextTheme = activeTheme() === 'dark' ? 'light' : 'dark';
    root.dataset.theme = nextTheme;
    localStorage.setItem('balkan-theme', nextTheme);
    updateLabel();
  });

  systemDark.addEventListener('change', updateLabel);
  updateLabel();
})();
