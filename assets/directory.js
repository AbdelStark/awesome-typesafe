/* Enhance the README-derived directory. The README remains the only resource data source. */
(() => {
  const article = document.querySelector('.markdown-body');
  const start = article?.querySelector('#community-projects');
  const end = article?.querySelector('#contributing');
  if (!start || !end) return;

  const sections = [];
  let heading = null;
  for (let node = start.nextElementSibling; node && node !== end; node = node.nextElementSibling) {
    if (node.tagName === 'H3') heading = node;
    if (node.tagName === 'UL' && heading) {
      const items = [...node.children].filter((child) => child.tagName === 'LI');
      node.classList.add('resource-list');
      heading.classList.add('resource-heading');
      sections.push({ heading, list: node, items });
      heading = null;
    }
  }
  if (!sections.length) return;

  const itemText = new WeakMap();
  const resourceItems = new Map();
  for (const section of sections) {
    for (const item of section.items) {
      itemText.set(item, item.textContent.toLocaleLowerCase());
      const source = item.querySelector('a[href]');
      if (!source) continue;
      const resourceUrl = source.href;
      const permalink = new URL(location.href);
      permalink.search = '';
      permalink.searchParams.set('resource', resourceUrl);
      permalink.hash = 'community-projects';
      const link = document.createElement('a');
      link.className = 'resource-permalink';
      link.href = permalink.href;
      link.textContent = 'Link to this project ↗';
      link.setAttribute('aria-label', `Link to ${source.textContent.trim()} in Awesome Jev`);
      item.append(link);
      resourceItems.set(resourceUrl, item);
    }
  }

  const tools = document.createElement('section');
  tools.className = 'directory-tools';
  tools.setAttribute('aria-label', 'Find a community resource');
  const categoryTitle = document.createElement('h3');
  categoryTitle.className = 'directory-tools__title';
  categoryTitle.textContent = 'Browse by category';
  const categoryGrid = document.createElement('div');
  categoryGrid.className = 'category-grid';
  categoryGrid.setAttribute('role', 'group');
  categoryGrid.setAttribute('aria-label', 'Filter projects by category');
  const categoryButtons = [];
  function addCategory(id, name, count) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'category-card';
    button.dataset.category = id;
    button.setAttribute('aria-pressed', 'false');
    const number = document.createElement('span');
    number.className = 'category-card__count';
    number.textContent = String(count).padStart(2, '0');
    const label = document.createElement('span');
    label.className = 'category-card__name';
    label.textContent = name;
    button.append(number, label);
    button.addEventListener('click', () => {
      activeResource = '';
      select.value = id;
      update();
    });
    categoryButtons.push(button);
    categoryGrid.append(button);
  }
  addCategory('', 'All projects', sections.reduce((total, section) => total + section.items.length, 0));
  for (const section of sections) {
    addCategory(section.heading.id, section.heading.textContent.trim(), section.items.length);
  }
  const label = document.createElement('label');
  label.htmlFor = 'resource-search';
  label.textContent = 'Find a project';
  const controls = document.createElement('div');
  controls.className = 'directory-tools__controls';
  const search = document.createElement('input');
  search.id = 'resource-search';
  search.type = 'search';
  search.placeholder = 'Search names, descriptions, and use cases';
  search.autocomplete = 'off';
  search.setAttribute('aria-keyshortcuts', '/');
  const select = document.createElement('select');
  select.id = 'resource-category';
  select.setAttribute('aria-label', 'Resource category');
  select.add(new Option('All categories', ''));
  for (const section of sections) {
    select.add(new Option(section.heading.textContent.trim(), section.heading.id));
  }
  const status = document.createElement('p');
  status.className = 'directory-tools__status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  const statusRow = document.createElement('div');
  statusRow.className = 'directory-tools__status-row';
  const share = document.createElement('button');
  share.type = 'button';
  share.className = 'directory-tools__share';
  share.textContent = 'Copy this view';
  share.setAttribute('aria-live', 'polite');
  share.hidden = !navigator.clipboard?.writeText;
  share.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(location.href);
      share.textContent = 'Link copied';
    } catch {
      share.textContent = 'Copy unavailable';
    }
    window.setTimeout(() => { share.textContent = 'Copy this view'; }, 2000);
  });
  statusRow.append(status, share);
  const empty = document.createElement('p');
  empty.className = 'directory-tools__empty';
  empty.hidden = true;
  empty.textContent = 'No projects match. Try another term or category.';
  controls.append(search, select);
  tools.append(categoryTitle, categoryGrid, label, controls, statusRow, empty);
  start.after(tools);

  const params = new URLSearchParams(location.search);
  search.value = params.get('q') || '';
  const category = params.get('category') || '';
  if (sections.some((section) => section.heading.id === category)) select.value = category;
  let activeResource = params.get('resource') || '';
  if (!resourceItems.has(activeResource)) activeResource = '';
  if (activeResource) {
    search.value = '';
    select.value = '';
  }

  function update() {
    const query = search.value.trim().toLocaleLowerCase();
    for (const button of categoryButtons) {
      button.setAttribute('aria-pressed', String(!activeResource && button.dataset.category === select.value));
    }
    let shown = 0;
    let total = 0;
    for (const section of sections) {
      let visibleInSection = 0;
      const categoryMatches = !select.value || select.value === section.heading.id;
      const headingMatches = section.heading.textContent.toLocaleLowerCase().includes(query);
      for (const item of section.items) {
        total += 1;
        const matches = activeResource
          ? resourceItems.get(activeResource) === item
          : categoryMatches && (headingMatches || itemText.get(item).includes(query));
        item.hidden = !matches;
        if (matches) {
          visibleInSection += 1;
          shown += 1;
        }
      }
      section.heading.hidden = visibleInSection === 0;
      section.list.hidden = visibleInSection === 0;
    }
    status.textContent = `Showing ${shown} of ${total} community projects`;
    empty.hidden = shown !== 0;
    const url = new URL(location.href);
    if (query) url.searchParams.set('q', search.value.trim());
    else url.searchParams.delete('q');
    if (select.value) url.searchParams.set('category', select.value);
    else url.searchParams.delete('category');
    if (activeResource) {
      url.searchParams.delete('q');
      url.searchParams.delete('category');
      url.searchParams.set('resource', activeResource);
    } else url.searchParams.delete('resource');
    history.replaceState(null, '', url);
  }

  search.addEventListener('input', () => { activeResource = ''; update(); });
  select.addEventListener('change', () => { activeResource = ''; update(); });
  document.addEventListener('keydown', (event) => {
    if (event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey &&
        !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) {
      event.preventDefault();
      search.focus();
    }
    if (event.key === 'Escape' && document.activeElement === search) {
      search.value = '';
      activeResource = '';
      update();
      search.blur();
    }
  });
  update();
  if (activeResource) resourceItems.get(activeResource).scrollIntoView({ block: 'center' });
})();
