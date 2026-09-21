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

  const tools = document.createElement('section');
  tools.className = 'directory-tools';
  tools.setAttribute('aria-label', 'Find a community resource');
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
  const empty = document.createElement('p');
  empty.className = 'directory-tools__empty';
  empty.hidden = true;
  empty.textContent = 'No projects match. Try another term or category.';
  controls.append(search, select);
  tools.append(label, controls, status, empty);
  start.after(tools);

  const params = new URLSearchParams(location.search);
  search.value = params.get('q') || '';
  const category = params.get('category') || '';
  if (sections.some((section) => section.heading.id === category)) select.value = category;

  function update() {
    const query = search.value.trim().toLocaleLowerCase();
    let shown = 0;
    let total = 0;
    for (const section of sections) {
      let visibleInSection = 0;
      const categoryMatches = !select.value || select.value === section.heading.id;
      for (const item of section.items) {
        total += 1;
        const matches = categoryMatches && item.textContent.toLocaleLowerCase().includes(query);
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
    history.replaceState(null, '', url);
  }

  search.addEventListener('input', update);
  select.addEventListener('change', update);
  document.addEventListener('keydown', (event) => {
    if (event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey &&
        !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) {
      event.preventDefault();
      search.focus();
    }
    if (event.key === 'Escape' && document.activeElement === search) {
      search.value = '';
      update();
      search.blur();
    }
  });
  update();
})();
