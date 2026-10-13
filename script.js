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
    const label = nextTheme === 'light' ? toggle.dataset.labelLight : toggle.dataset.labelDark;
    toggle.setAttribute('aria-label', label);
    toggle.setAttribute('title', label);
  }

  toggle.addEventListener('click', function () {
    const nextTheme = activeTheme() === 'dark' ? 'light' : 'dark';
    root.dataset.theme = nextTheme;
    localStorage.setItem('balkan-theme', nextTheme);
    updateLabel();
  });

  systemDark.addEventListener('change', updateLabel);
  updateLabel();

  const headerMenus = [...document.querySelectorAll('.tools-menu, .language-selector')];
  for (const menu of headerMenus) {
    menu.addEventListener('toggle', function () {
      if (!menu.open) return;
      for (const otherMenu of headerMenus) {
        if (otherMenu !== menu) otherMenu.open = false;
      }
    });
  }

  document.addEventListener('pointerdown', function (event) {
    for (const menu of headerMenus) {
      if (menu.open && !menu.contains(event.target)) menu.open = false;
    }
  });

  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape') return;
    const openMenu = headerMenus.find(menu => menu.open);
    if (!openMenu) return;
    openMenu.open = false;
    openMenu.querySelector('summary')?.focus();
  });
})();
