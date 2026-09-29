(function () {
  const filters = [...document.querySelectorAll('[data-news-filter]')];
  const stories = [...document.querySelectorAll('[data-news-story]')];
  const empty = document.querySelector('[data-news-empty]');
  if (filters.length === 0 || stories.length === 0) return;

  function applyFilter(currency, updateUrl = true) {
    const selected = filters.some(button => button.dataset.newsFilter === currency) ? currency : 'all';
    let visible = 0;
    for (const story of stories) {
      const currencies = (story.dataset.currencies || '').split(/\s+/);
      story.hidden = selected !== 'all' && !currencies.includes(selected);
      if (!story.hidden) visible += 1;
    }
    for (const button of filters) {
      const active = button.dataset.newsFilter === selected;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    }
    if (empty) empty.hidden = visible !== 0;
    if (updateUrl) {
      const url = new URL(window.location.href);
      if (selected === 'all') url.searchParams.delete('currency');
      else url.searchParams.set('currency', selected);
      history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
    }
  }

  for (const button of filters) button.addEventListener('click', () => applyFilter(button.dataset.newsFilter));
  applyFilter(new URLSearchParams(window.location.search).get('currency') || 'all', false);
})();
