/* Enhance the README-derived directory. The README remains the only resource data source. */
(async () => {
  const article = document.querySelector('.markdown-body');
  for (const pre of article?.querySelectorAll('.highlight > pre') || []) {
    pre.tabIndex = 0;
  }
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

  const projectPaths = new Map();
  const projectResources = new Map();
  try {
    const response = await fetch(new URL('resources.json', location.href));
    if (response.ok) {
      const directory = await response.json();
      for (const category of directory.categories) {
        for (const resource of category.resources) {
          const url = new URL(resource.url).href;
          projectPaths.set(url, resource.permalink);
          projectResources.set(url, { ...resource, category: category.name });
        }
      }
    }
  } catch {
    // The README-rendered directory still works if the JSON feed is unavailable.
  }

  const liveRow = [...article.querySelectorAll(':scope > table:first-of-type tbody tr')]
    .find((row) => row.cells[0]?.textContent.trim() === 'See it work live');
  const featured = [...(liveRow?.cells[1]?.querySelectorAll('a[href]') || [])]
    .map((link) => projectResources.get(link.href))
    .filter(Boolean)
    .slice(0, 3);
  if (featured.length) {
    const spotlight = document.createElement('section');
    spotlight.className = 'featured-live';
    spotlight.setAttribute('aria-labelledby', 'featured-live-title');
    const label = document.createElement('p');
    label.className = 'featured-live__label';
    label.textContent = 'A few places to start';
    const title = document.createElement('h2');
    title.id = 'featured-live-title';
    title.textContent = 'See Jev at work';
    const intro = document.createElement('p');
    intro.className = 'featured-live__intro';
    intro.textContent = 'Open a live build, or read what it actually does before you try it.';
    const cards = document.createElement('div');
    cards.className = 'featured-live__cards';
    for (const resource of featured) {
      const card = document.createElement('article');
      card.className = 'featured-live__card';
      const path = new URL(resource.permalink.replace(/^\//, ''), location.href);
      const slug = resource.permalink.split('/').filter(Boolean).at(-1);
      const imageLink = document.createElement('a');
      imageLink.className = 'featured-live__image';
      imageLink.href = path.href;
      imageLink.setAttribute('aria-label', `Read the Awesome Jev listing for ${resource.name}`);
      const image = document.createElement('img');
      image.src = new URL(`assets/cards/${slug}.png`, location.href).href;
      image.alt = '';
      image.width = 1200;
      image.height = 630;
      image.loading = 'lazy';
      image.decoding = 'async';
      imageLink.append(image);
      const body = document.createElement('div');
      body.className = 'featured-live__body';
      const category = document.createElement('p');
      category.className = 'featured-live__category';
      category.textContent = resource.category;
      const name = document.createElement('h3');
      const nameLink = document.createElement('a');
      nameLink.href = path.href;
      nameLink.textContent = resource.name;
      name.append(nameLink);
      const description = document.createElement('p');
      description.className = 'featured-live__description';
      description.textContent = resource.description_markdown
        .replace(/\[([^\]]+)]\(https?:\/\/[^)]+\)/g, '$1')
        .replace(/[`*_]/g, '');
      const actions = document.createElement('div');
      actions.className = 'featured-live__actions';
      const original = document.createElement('a');
      original.href = resource.url;
      original.textContent = 'Open original ↗';
      const listing = document.createElement('a');
      listing.href = path.href;
      listing.textContent = 'Read listing →';
      actions.append(original, listing);
      body.append(category, name, description, actions);
      card.append(imageLink, body);
      cards.append(card);
    }
    spotlight.append(label, title, intro, cards);
    (article.querySelector(':scope > blockquote') || article.querySelector('#contents'))?.before(spotlight);
  }

  // Present the README's four intent routes as cards on Pages. The table stays
  // readable in the README and remains the single source for every route.
  const routeTable = article.querySelector(':scope > table:first-of-type');
  const routes = [...(routeTable?.tBodies[0]?.rows || [])]
    .filter((row) => row.cells.length === 2 && row.cells[0].textContent.trim());
  if (routes.length) {
    const paths = document.createElement('section');
    paths.className = 'reader-paths';
    paths.setAttribute('aria-labelledby', 'reader-paths-title');
    const heading = document.createElement('h2');
    heading.id = 'reader-paths-title';
    heading.textContent = 'Pick a path';
    const intro = document.createElement('p');
    intro.className = 'reader-paths__intro';
    intro.textContent = 'Choose what you want to do next.';
    const grid = document.createElement('div');
    grid.className = 'reader-paths__grid';
    routes.forEach((row, index) => {
      const card = document.createElement('article');
      card.className = 'reader-paths__card';
      const number = document.createElement('span');
      number.className = 'reader-paths__number';
      number.textContent = String(index + 1).padStart(2, '0');
      number.setAttribute('aria-hidden', 'true');
      const title = document.createElement('h3');
      title.textContent = row.cells[0].textContent.trim();
      const detail = document.createElement('p');
      detail.className = 'reader-paths__detail';
      detail.append(...[...row.cells[1].childNodes].map((node) => node.cloneNode(true)));
      card.append(number, title, detail);
      grid.append(card);
    });
    paths.append(heading, intro, grid);
    routeTable.replaceWith(paths);
  }

  // Turn the README's tool-choice table into a visual three-path guide.
  const toolHeading = article.querySelector('#choose-the-right-tool');
  let toolTable = toolHeading?.nextElementSibling;
  while (toolTable && !['TABLE', 'H2', 'H3'].includes(toolTable.tagName)) {
    toolTable = toolTable.nextElementSibling;
  }
  if (toolTable?.tagName === 'TABLE') {
    const rows = [...toolTable.tBodies[0].rows].filter((row) => row.cells.length === 3);
    if (rows.length === 3) {
      const guide = document.createElement('div');
      guide.className = 'tool-fit';
      for (const [index, row] of rows.entries()) {
        const card = document.createElement('article');
        card.className = 'tool-fit__card';
        const number = document.createElement('span');
        number.className = 'tool-fit__number';
        number.textContent = `PATH ${String(index + 1).padStart(2, '0')}`;
        const title = document.createElement('h4');
        title.textContent = row.cells[1].textContent.trim();
        const job = document.createElement('p');
        job.className = 'tool-fit__job';
        job.append(...[...row.cells[0].childNodes].map((node) => node.cloneNode(true)));
        const example = document.createElement('p');
        example.className = 'tool-fit__example';
        example.append(...[...row.cells[2].childNodes].map((node) => node.cloneNode(true)));
        card.append(number, title, job, example);
        guide.append(card);
      }
      toolTable.replaceWith(guide);
    }
  }

  const evidenceHeading = article.querySelector('#before-you-trust-a-decision');
  let evidenceTable = evidenceHeading?.nextElementSibling;
  while (evidenceTable && !['TABLE', 'H2', 'H3'].includes(evidenceTable.tagName)) {
    evidenceTable = evidenceTable.nextElementSibling;
  }
  if (evidenceTable?.tagName === 'TABLE') {
    const rows = [...evidenceTable.tBodies[0].rows].filter((row) => row.cells.length === 3);
    if (rows.length) {
      const grid = document.createElement('div');
      grid.className = 'field-evidence';
      for (const [index, row] of rows.entries()) {
        const card = document.createElement('article');
        card.className = 'field-evidence__card';
        const number = document.createElement('span');
        number.className = 'field-evidence__number';
        number.textContent = `FIELD NOTE ${String(index + 1).padStart(2, '0')}`;
        const title = document.createElement('h4');
        title.textContent = row.cells[0].textContent.trim();
        const findingLabel = document.createElement('strong');
        findingLabel.textContent = 'What was measured';
        const finding = document.createElement('p');
        finding.append(...[...row.cells[1].childNodes].map((node) => node.cloneNode(true)));
        const testLabel = document.createElement('strong');
        testLabel.textContent = 'Before shipping';
        const test = document.createElement('p');
        test.append(...[...row.cells[2].childNodes].map((node) => node.cloneNode(true)));
        card.append(number, title, findingLabel, finding, testLabel, test);
        grid.append(card);
      }
      evidenceTable.replaceWith(grid);
    }
  }

  const itemText = new WeakMap();
  const resourceItems = new Map();
  for (const section of sections) {
    for (const item of section.items) {
      itemText.set(item, item.textContent.toLocaleLowerCase());
      const source = item.querySelector('a[href]');
      if (!source) continue;
      const resourceUrl = source.href;
      const projectPath = projectPaths.get(resourceUrl);
      const permalink = projectPath
        ? new URL(projectPath.replace(/^\//, ''), location.href)
        : new URL(location.href);
      if (!projectPath) {
        permalink.search = '';
        permalink.searchParams.set('resource', resourceUrl);
        permalink.hash = 'community-projects';
      }
      const link = document.createElement('a');
      link.className = 'resource-permalink';
      link.href = permalink.href;
      link.textContent = 'Full listing →';
      link.setAttribute('aria-label', `View the full Awesome Jev listing for ${source.textContent.trim()}`);
      const description = document.createElement('div');
      description.className = 'resource-list__description';
      for (const node of [...item.childNodes]) {
        if (node !== source) description.append(node);
      }
      if (description.firstChild?.nodeType === Node.TEXT_NODE) {
        description.firstChild.textContent = description.firstChild.textContent.replace(/^\s*—\s*/, '');
      }
      if (description.querySelector('a[href]')) description.classList.add('resource-list__description--linked');
      source.after(description);
      const actions = document.createElement('div');
      actions.className = 'resource-actions';
      actions.append(link);
      if (navigator.clipboard?.writeText) {
        const badge = document.createElement('button');
        badge.type = 'button';
        badge.className = 'resource-badge';
        badge.textContent = 'Copy listing badge';
        badge.setAttribute('aria-label', `Copy a listing badge for ${source.textContent.trim()}`);
        badge.addEventListener('click', async () => {
          const image = new URL('assets/listed-badge.svg', location.href).href;
          const markdown = `[![Listed in Awesome Jev](${image})](${permalink.href})`;
          try {
            await navigator.clipboard.writeText(markdown);
            badge.textContent = 'Badge copied';
          } catch {
            badge.textContent = 'Copy unavailable';
          }
          window.setTimeout(() => { badge.textContent = 'Copy listing badge'; }, 2000);
        });
        actions.append(badge);
      }
      item.append(actions);
      resourceItems.set(resourceUrl, item);
    }
  }

  const tools = document.createElement('section');
  tools.className = 'directory-tools';
  tools.setAttribute('aria-label', 'Find a community resource');
  const categoryTitle = document.createElement('h3');
  categoryTitle.className = 'directory-tools__title';
  categoryTitle.textContent = 'Browse by category';
  const hint = document.createElement('p');
  hint.className = 'directory-tools__hint';
  hint.textContent = 'Listed here? Open your page for a badge and shareable image.';
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
  tools.append(categoryTitle, hint, categoryGrid, label, controls, statusRow, empty);
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
  if (activeResource) {
    const selected = resourceItems.get(activeResource);
    window.addEventListener('load', () => {
      requestAnimationFrame(() => selected.scrollIntoView({ block: 'center', behavior: 'instant' }));
    }, { once: true });
  }
})();
