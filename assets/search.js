/* Search the README-derived directory from every page, without another data source. */
(() => {
  const opener = document.querySelector('.site-nav__search');
  const dialog = document.querySelector('#site-search');
  const home = document.querySelector('.wordmark');
  if (!opener || !dialog || !home || typeof dialog.showModal !== 'function') return;

  const input = dialog.querySelector('#site-search-input');
  const close = dialog.querySelector('.site-search__close');
  const status = dialog.querySelector('.site-search__status');
  const results = dialog.querySelector('.site-search__results');
  const all = dialog.querySelector('.site-search__all');
  const normalize = (value) => value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase();
  const plain = (value) => value.replace(/\[([^\]]+)]\(https?:\/\/[^)]+\)/g, '$1').replace(/[`*_]/g, '');
  const version = document.currentScript?.dataset.directoryVersion;
  let categories;
  let entries;

  function destination(path) {
    return new URL(path.replace(/^\//, ''), home.href).href;
  }

  function addResult(name, path, category, description = '') {
    const item = document.createElement('li');
    const link = document.createElement('a');
    link.href = destination(path);
    const eyebrow = document.createElement('small');
    eyebrow.textContent = category;
    const title = document.createElement('strong');
    title.textContent = name;
    link.append(eyebrow, title);
    if (description) {
      const detail = document.createElement('span');
      const preview = plain(description).replace(/\s+/g, ' ').trim();
      detail.textContent = preview.length > 145 ? `${preview.slice(0, 142).trimEnd()}…` : preview;
      link.append(detail);
    }
    item.append(link);
    results.append(item);
  }

  function update() {
    if (!categories) return;
    const query = input.value.trim();
    const terms = normalize(query).split(/\s+/).filter(Boolean);
    results.replaceChildren();
    results.classList.toggle('site-search__results--categories', !terms.length);
    all.hidden = true;
    if (!terms.length) {
      status.textContent = `Browse ${entries.length} community projects in ${categories.length} categories.`;
      for (const category of categories) {
        addResult(category.name, category.permalink, `${category.resources.length} projects`);
      }
      return;
    }
    const normalizedQuery = normalize(query);
    const rank = (entry) =>
      (entry.nameSearch === normalizedQuery ? 100 : 0) +
      (entry.nameSearch.startsWith(normalizedQuery) ? 50 : 0) +
      (entry.nameSearch.includes(normalizedQuery) ? 25 : 0) +
      terms.filter((term) => entry.nameSearch.includes(term)).length * 10;
    const matches = entries
      .filter((entry) => terms.every((term) => entry.search.includes(term)))
      .sort((left, right) => rank(right) - rank(left) || left.name.localeCompare(right.name));
    status.textContent = matches.length
      ? `${matches.length} of ${entries.length} projects match “${query}”.`
      : `No projects match “${query}”. Try another term.`;
    for (const entry of matches.slice(0, 8)) {
      addResult(entry.name, entry.permalink, entry.category, entry.description_markdown);
    }
    if (matches.length) {
      const url = new URL(home.href);
      url.searchParams.set('q', query);
      url.hash = 'community-projects';
      all.href = url.href;
      all.textContent = matches.length > 8 ? `View all ${matches.length} matches →` : 'View matches in the full directory →';
      all.hidden = false;
    }
  }

  async function open(event) {
    event.preventDefault();
    if (!dialog.open) dialog.showModal();
    input.focus();
    if (categories) {
      update();
      return;
    }
    status.textContent = 'Loading projects…';
    try {
      const directoryUrl = new URL('resources.json', home.href);
      if (version) directoryUrl.searchParams.set('v', version);
      const response = await fetch(directoryUrl);
      if (!response.ok) throw new Error('Directory unavailable');
      const directory = await response.json();
      if (!Array.isArray(directory.categories)) throw new Error('Invalid directory');
      categories = directory.categories;
      entries = categories.flatMap((category) => category.resources.map((resource) => ({
        ...resource,
        category: category.name,
        nameSearch: normalize(resource.name),
        search: normalize(`${category.name} ${resource.name} ${plain(resource.description_markdown)}`),
      })));
      update();
    } catch {
      status.textContent = 'Search is unavailable right now. Open the full directory instead.';
      all.href = `${home.href}#community-projects`;
      all.textContent = 'Open the full directory →';
      all.hidden = false;
    }
  }

  opener.addEventListener('click', open);
  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => opener.focus());
  dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
  input.addEventListener('input', update);
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !all.hidden) {
      event.preventDefault();
      location.href = all.href;
    }
  });
  document.addEventListener('keydown', (event) => {
    if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey || dialog.open ||
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName) ||
        document.activeElement?.isContentEditable) return;
    open(event);
  });
})();
