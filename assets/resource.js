/* Enhance the static project page with sharing and clipboard actions. */
(() => {
  const share = document.querySelector('.resource-share');
  const buttons = share?.querySelector('.resource-share__buttons');
  const status = share?.querySelector('.resource-share__status');
  const canonical = document.querySelector('link[rel="canonical"]');
  const home = document.querySelector('.wordmark');
  if (!buttons || !status || !canonical || !home) return;

  let resetTimer;
  function report(message) {
    status.textContent = message;
    clearTimeout(resetTimer);
    resetTimer = window.setTimeout(() => { status.textContent = ''; }, 3000);
  }

  function copyButton(label, value, success) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(typeof value === 'function' ? value() : value);
        report(success);
      } catch {
        report('Copy unavailable in this browser.');
      }
    });
    return button;
  }

  const pageUrl = canonical.href;
  const isProject = Boolean(document.querySelector('.resource-page'));
  const categoryPage = document.querySelector('.category-page');
  function shareUrl() {
    if (!categoryPage) return pageUrl;
    const url = new URL(pageUrl);
    const query = new URL(location.href).searchParams.get('q')?.trim();
    if (query) {
      url.searchParams.set('q', query);
      url.hash = 'category-projects';
    }
    return url.href;
  }
  if (navigator.clipboard?.writeText) {
    buttons.prepend(copyButton('Copy page link', shareUrl, 'Page link copied.'));
  }
  if (isProject && navigator.clipboard?.writeText) {
    const badgeUrl = new URL('assets/listed-badge.svg', home.href).href;
    const badge = `[![Listed in Awesome Jev](${badgeUrl})](${pageUrl})`;
    buttons.append(copyButton('Copy listing badge', badge, 'Badge Markdown copied.'));
  }
  if (navigator.share) {
    const shareButton = document.createElement('button');
    shareButton.type = 'button';
    shareButton.textContent = isProject ? 'Share project' : 'Share topic';
    shareButton.addEventListener('click', async () => {
      try {
        await navigator.share({ title: document.title, url: shareUrl() });
        report(isProject ? 'Project shared.' : 'Topic shared.');
      } catch (error) {
        if (error?.name !== 'AbortError') report('Share unavailable in this browser.');
      }
    });
    buttons.prepend(shareButton);
  }

  if (categoryPage) {
    const filter = categoryPage.querySelector('.category-page__filter');
    const input = filter?.querySelector('input');
    const clear = filter?.querySelector('button');
    const count = filter?.querySelector('.category-page__filter-status');
    const empty = categoryPage.querySelector('.category-page__empty');
    const cards = [...categoryPage.querySelectorAll('.category-page__card')];
    if (!filter || !input || !clear || !count || !empty || !cards.length) return;

    const normalizeSearch = (value) => value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase();
    const searchable = cards.map((card) => normalizeSearch([
      card.querySelector('h2')?.textContent || '',
      card.querySelector('.category-page__card-body p')?.textContent || '',
    ].join(' ')));
    function updateFilter(updateUrl) {
      const query = input.value.trim();
      const terms = normalizeSearch(query).split(/\s+/).filter(Boolean);
      let visible = 0;
      cards.forEach((card, index) => {
        const matches = terms.every((term) => searchable[index].includes(term));
        card.hidden = !matches;
        if (matches) visible += 1;
      });
      clear.hidden = !query;
      empty.hidden = visible !== 0;
      count.textContent = query
        ? `${visible} of ${cards.length} listings match “${query}”.`
        : `Showing all ${cards.length} listings.`;
      if (updateUrl) {
        const url = new URL(location.href);
        if (query) url.searchParams.set('q', query);
        else url.searchParams.delete('q');
        history.replaceState(null, '', url);
      }
    }

    input.value = new URL(location.href).searchParams.get('q') || '';
    input.addEventListener('input', () => updateFilter(true));
    clear.addEventListener('click', () => {
      input.value = '';
      updateFilter(true);
      input.focus();
    });
    filter.hidden = false;
    updateFilter(false);
  }
})();
