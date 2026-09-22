/* Enhance the README-derived directory. The README remains the only resource data source. */
(async () => {
  const initialHash = location.hash;
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
  const projectResourcesByPath = new Map();
  try {
    const directoryUrl = new URL('resources.json', location.href);
    const buildVersion = document.currentScript?.dataset.directoryVersion;
    if (buildVersion) directoryUrl.searchParams.set('v', buildVersion);
    const response = await fetch(directoryUrl);
    if (response.ok) {
      const directory = await response.json();
      for (const category of directory.categories) {
        for (const resource of category.resources) {
          const url = new URL(resource.url).href;
          projectPaths.set(url, resource.permalink);
          const entry = { ...resource, category: category.name };
          projectResources.set(url, entry);
          projectResourcesByPath.set(new URL(resource.permalink.replace(/^\//, ''), location.href).pathname, entry);
        }
      }
    }
  } catch {
    // The README-rendered directory still works if the JSON feed is unavailable.
  }

  const routeTable = [...article.querySelectorAll(':scope > table')]
    .find((table) => table.tHead?.rows[0]?.cells[0]?.textContent.trim() === 'I want to…');
  const featuredHeading = article.querySelector('#see-jev-at-work');
  const featuredIntro = featuredHeading?.nextElementSibling;
  const featuredPreviews = article.querySelector('#featured-previews');
  const featured = [...(featuredPreviews?.querySelectorAll('a[href]') || [])]
    .map((link) => ({ resource: projectResources.get(link.href), previewImage: link.querySelector('img')?.src }))
    .filter(({ resource, previewImage }) => resource && previewImage)
    .slice(0, 3);
  if (featured.length === 3) {
    const spotlight = document.createElement('section');
    spotlight.className = 'featured-live';
    spotlight.setAttribute('aria-labelledby', 'see-jev-at-work');
    const label = document.createElement('p');
    label.className = 'featured-live__label';
    label.textContent = 'A few places to start';
    const title = document.createElement('h2');
    title.id = 'see-jev-at-work';
    title.textContent = featuredHeading.textContent.trim();
    const intro = document.createElement('p');
    intro.className = 'featured-live__intro';
    intro.textContent = featuredIntro.textContent.trim();
    const cards = document.createElement('div');
    cards.className = 'featured-live__cards';
    cards.setAttribute('role', 'group');
    cards.setAttribute('aria-label', 'Featured Jev projects');
    for (const { resource, previewImage } of featured) {
      const card = document.createElement('article');
      card.className = 'featured-live__card';
      const path = new URL(resource.permalink.replace(/^\//, ''), location.href);
      const imageLink = document.createElement('a');
      imageLink.className = 'featured-live__image';
      imageLink.href = resource.url;
      imageLink.setAttribute('aria-label', `Open the original ${resource.name} project`);
      const image = document.createElement('img');
      image.src = previewImage;
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
    const navigation = document.createElement('div');
    navigation.className = 'featured-live__navigation';
    const position = document.createElement('span');
    position.className = 'featured-live__position';
    position.setAttribute('aria-live', 'polite');
    const controls = document.createElement('div');
    controls.className = 'featured-live__controls';
    const previous = document.createElement('button');
    previous.type = 'button';
    previous.textContent = '←';
    previous.setAttribute('aria-label', 'Previous featured project');
    const next = document.createElement('button');
    next.type = 'button';
    next.textContent = '→';
    next.setAttribute('aria-label', 'Next featured project');
    controls.append(previous, next);
    navigation.append(position, controls);
    spotlight.append(label, title, intro, navigation, cards);
    featuredHeading.replaceWith(spotlight);
    featuredIntro.remove();
    featuredPreviews.remove();
    const cardOffsets = () => [...cards.children].map((card) => card.offsetLeft - cards.firstElementChild.offsetLeft);
    const currentCard = () => cardOffsets().reduce((best, offset, index, offsets) =>
      Math.abs(offset - cards.scrollLeft) < Math.abs(offsets[best] - cards.scrollLeft) ? index : best, 0);
    const updateNavigation = () => {
      const index = currentCard();
      position.textContent = `${index + 1} of ${featured.length} · Swipe to explore`;
      previous.disabled = index === 0;
      next.disabled = index === featured.length - 1;
    };
    const move = (step) => {
      const offsets = cardOffsets();
      const target = Math.max(0, Math.min(offsets.length - 1, currentCard() + step));
      cards.scrollTo({
        left: offsets[target],
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
      });
    };
    previous.addEventListener('click', () => move(-1));
    next.addEventListener('click', () => move(1));
    cards.addEventListener('scroll', updateNavigation, { passive: true });
    window.addEventListener('resize', updateNavigation);
    updateNavigation();
  }

  // The dated picks and their links live in README.md. Enrich only listings
  // that the README-derived directory confirms still exist.
  const recentHeading = article.querySelector('#recently-curated');
  const recentIntro = recentHeading?.nextElementSibling;
  const recentList = recentIntro?.nextElementSibling;
  if (recentIntro?.tagName === 'P' && recentList?.tagName === 'UL') {
    const items = [...recentList.children].filter((item) => item.tagName === 'LI');
    const picks = items.map((item) => {
      const link = item.querySelector('a[href]');
      const resource = link && projectResourcesByPath.get(new URL(link.href).pathname);
      if (!resource) return null;
      return {
        resource,
        note: item.textContent.trim().slice(link.textContent.trim().length).replace(/^\s*[—-]\s*/, ''),
      };
    });
    if (items.length && picks.every(Boolean)) {
      const section = document.createElement('section');
      section.className = 'recent-picks';
      section.setAttribute('aria-labelledby', 'recently-curated');
      const eyebrow = document.createElement('p');
      eyebrow.className = 'recent-picks__eyebrow';
      eyebrow.textContent = 'NEW IN THE DIRECTORY / 22 SEPTEMBER';
      const title = document.createElement('h2');
      title.id = 'recently-curated';
      title.textContent = recentHeading.textContent.trim();
      const intro = document.createElement('p');
      intro.className = 'recent-picks__intro';
      intro.textContent = recentIntro.textContent.trim();
      const grid = document.createElement('div');
      grid.className = 'recent-picks__grid';
      for (const { resource, note } of picks) {
        const card = document.createElement('article');
        card.className = 'recent-picks__card';
        const path = new URL(resource.permalink.replace(/^\//, ''), location.href);
        const slug = resource.permalink.split('/').filter(Boolean).at(-1);
        const imageLink = document.createElement('a');
        imageLink.href = path.href;
        imageLink.className = 'recent-picks__image';
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
        body.className = 'recent-picks__body';
        const category = document.createElement('p');
        category.className = 'recent-picks__category';
        category.textContent = resource.category;
        const name = document.createElement('h3');
        const nameLink = document.createElement('a');
        nameLink.href = path.href;
        nameLink.textContent = resource.name;
        name.append(nameLink);
        const detail = document.createElement('p');
        detail.className = 'recent-picks__detail';
        detail.textContent = note;
        const actions = document.createElement('div');
        actions.className = 'recent-picks__actions';
        const listing = document.createElement('a');
        listing.href = path.href;
        listing.textContent = 'Read listing →';
        const original = document.createElement('a');
        original.href = resource.url;
        original.textContent = 'Open original ↗';
        actions.append(listing, original);
        body.append(category, name, detail, actions);
        card.append(imageLink, body);
        grid.append(card);
      }
      section.append(eyebrow, title, intro, grid);
      recentHeading.replaceWith(section);
      recentIntro.remove();
      recentList.remove();
    }
  }

  // Present the README's four intent routes as cards on Pages. The table stays
  // readable in the README and remains the single source for every route.
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

  // Keep the README table canonical and show its provider paths as cards on Pages.
  const accessHeading = article.querySelector('#choose-where-to-call-jev');
  let accessTable = accessHeading?.nextElementSibling;
  while (accessTable && !['TABLE', 'H2', 'H3'].includes(accessTable.tagName)) {
    accessTable = accessTable.nextElementSibling;
  }
  if (accessTable?.tagName === 'TABLE') {
    const rows = [...accessTable.tBodies[0].rows].filter((row) => row.cells.length === 3);
    if (rows.length) {
      const grid = document.createElement('div');
      grid.className = 'access-paths';
      for (const [index, row] of rows.entries()) {
        const card = document.createElement('article');
        card.className = 'access-paths__card';
        const number = document.createElement('span');
        number.className = 'access-paths__number';
        number.textContent = `ROUTE ${String(index + 1).padStart(2, '0')}`;
        const title = document.createElement('h4');
        title.append(...[...row.cells[0].childNodes].map((node) => node.cloneNode(true)));
        const way = document.createElement('p');
        way.className = 'access-paths__way';
        way.append(...[...row.cells[1].childNodes].map((node) => node.cloneNode(true)));
        const checkLabel = document.createElement('strong');
        checkLabel.textContent = 'Before using it';
        const check = document.createElement('p');
        check.className = 'access-paths__check';
        check.append(...[...row.cells[2].childNodes].map((node) => node.cloneNode(true)));
        card.append(number, title, way, checkLabel, check);
        grid.append(card);
      }
      accessTable.replaceWith(grid);
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

  const normalizeSearch = (value) => value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase();
  const itemText = new WeakMap();
  const resourceItems = new Map();
  const savedCatalog = new Map();
  const savedItems = new Map();
  const saveButtons = new Map();
  let renderReadingList = () => {};
  for (const section of sections) {
    for (const item of section.items) {
      itemText.set(item, normalizeSearch(`${section.heading.textContent} ${item.textContent}`));
      const source = item.querySelector('a[href]');
      if (!source) continue;
      source.classList.add('resource-source');
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
      const summary = document.createElement('p');
      summary.className = 'resource-list__summary';
      const plain = description.textContent.replace(/\s+/g, ' ').trim();
      const preview = plain.slice(0, 170);
      summary.textContent = plain.length > 170
        ? `${preview.slice(0, preview.lastIndexOf(' ') > 0 ? preview.lastIndexOf(' ') : 170)}…`
        : plain;
      description.after(summary);
      if (projectPath) {
        const thumbnail = document.createElement('a');
        thumbnail.className = 'resource-thumbnail';
        thumbnail.href = permalink.href;
        thumbnail.setAttribute('aria-label', `View the full Awesome Jev listing for ${source.textContent.trim()}`);
        const image = document.createElement('img');
        const slug = projectPath.split('/').filter(Boolean).at(-1);
        image.src = new URL(`assets/cards/${slug}.png`, location.href).href;
        image.alt = '';
        image.width = 1200;
        image.height = 630;
        image.loading = 'lazy';
        image.decoding = 'async';
        thumbnail.append(image);
        item.prepend(thumbnail);
      }
      const actions = document.createElement('div');
      actions.className = 'resource-actions';
      actions.append(link);
      if (projectPath) {
        const slug = projectPath.split('/').filter(Boolean).at(-1);
        savedCatalog.set(slug, {
          name: source.textContent.trim(),
          category: section.heading.textContent.trim(),
          description: plain,
          permalink: permalink.href,
        });
        const save = document.createElement('button');
        save.type = 'button';
        save.className = 'resource-save';
        save.textContent = 'Save';
        save.setAttribute('aria-label', `Save ${source.textContent.trim()} to a reading list`);
        save.setAttribute('aria-pressed', 'false');
        save.addEventListener('click', () => {
          if (savedItems.has(slug)) savedItems.delete(slug);
          else if (savedItems.size < 8) savedItems.set(slug, savedCatalog.get(slug));
          renderReadingList();
        });
        actions.append(save);
        saveButtons.set(slug, save);
      }
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
  categoryTitle.textContent = 'Find a project';
  const hint = document.createElement('p');
  hint.className = 'directory-tools__hint';
  hint.textContent = 'Search names and use cases with words in any order, or choose a category. Save up to eight projects to share a reading list.';
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
      search.value = '';
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
  label.textContent = 'Search projects';
  const controls = document.createElement('div');
  controls.className = 'directory-tools__controls';
  const search = document.createElement('input');
  search.id = 'resource-search';
  search.type = 'search';
  search.placeholder = 'Search names, descriptions, and use cases';
  search.autocomplete = 'off';
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
  const reset = document.createElement('button');
  reset.type = 'button';
  reset.className = 'directory-tools__reset';
  reset.textContent = 'Clear filters';
  reset.addEventListener('click', () => {
    search.value = '';
    select.value = '';
    activeResource = '';
    update();
    search.focus();
  });
  const viewControls = document.createElement('div');
  viewControls.className = 'directory-tools__views';
  viewControls.setAttribute('role', 'group');
  viewControls.setAttribute('aria-label', 'Directory view');
  const viewButtons = [];
  for (const [value, name] of [['gallery', 'Gallery'], ['compact', 'Compact']]) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = name;
    button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', () => { view = value; update(); });
    viewButtons.push({ button, value });
    viewControls.append(button);
  }
  viewControls.hidden = !projectPaths.size;
  const shareActions = document.createElement('div');
  shareActions.className = 'directory-tools__share-actions';
  const viewUrl = () => {
    const url = new URL(location.href);
    url.hash = 'community-projects';
    return url.href;
  };
  if (navigator.share) {
    const nativeShare = document.createElement('button');
    nativeShare.type = 'button';
    nativeShare.className = 'directory-tools__share';
    nativeShare.textContent = 'Share this view';
    nativeShare.addEventListener('click', async () => {
      try {
        await navigator.share({ title: document.title, url: viewUrl() });
        nativeShare.textContent = 'View shared';
      } catch (error) {
        if (error?.name === 'AbortError') return;
        nativeShare.textContent = 'Share unavailable';
      }
      window.setTimeout(() => { nativeShare.textContent = 'Share this view'; }, 2000);
    });
    shareActions.append(nativeShare);
  }
  const share = document.createElement('button');
  share.type = 'button';
  share.className = 'directory-tools__share';
  share.textContent = 'Copy this view';
  share.setAttribute('aria-live', 'polite');
  share.hidden = !navigator.clipboard?.writeText;
  share.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(viewUrl());
      share.textContent = 'Link copied';
    } catch {
      share.textContent = 'Copy unavailable';
    }
    window.setTimeout(() => { share.textContent = 'Copy this view'; }, 2000);
  });
  shareActions.append(share);
  statusRow.append(status, reset, viewControls, shareActions);
  const empty = document.createElement('p');
  empty.className = 'directory-tools__empty';
  empty.hidden = true;
  empty.textContent = 'No projects match. Try another term or category.';
  controls.append(search, select);
  tools.append(categoryTitle, hint, label, controls, categoryGrid, statusRow, empty);
  start.after(tools);

  const params = new URLSearchParams(location.search);
  if (savedCatalog.size && typeof HTMLDialogElement !== 'undefined') {
    const bar = document.createElement('button');
    bar.type = 'button';
    bar.className = 'reading-list-bar';
    bar.hidden = true;
    const dialog = document.createElement('dialog');
    dialog.className = 'reading-list';
    dialog.setAttribute('aria-labelledby', 'reading-list-title');
    const header = document.createElement('div');
    header.className = 'reading-list__header';
    const title = document.createElement('h2');
    title.id = 'reading-list-title';
    title.textContent = 'Your Jev reading list';
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'reading-list__close';
    close.textContent = 'Close';
    close.addEventListener('click', () => dialog.close());
    header.append(title, close);
    const intro = document.createElement('p');
    intro.className = 'reading-list__intro';
    intro.textContent = 'Save up to eight listings, then share a link to this selection. Every entry comes from the README.';
    const list = document.createElement('ul');
    list.className = 'reading-list__items';
    const empty = document.createElement('p');
    empty.className = 'reading-list__empty';
    empty.textContent = 'Save a project from the directory to start a reading list.';
    const actions = document.createElement('div');
    actions.className = 'reading-list__actions';
    const copy = document.createElement('button');
    copy.type = 'button';
    copy.textContent = 'Copy list link';
    copy.hidden = !navigator.clipboard?.writeText;
    const nativeShare = document.createElement('button');
    nativeShare.type = 'button';
    nativeShare.textContent = 'Share list';
    nativeShare.hidden = !navigator.share;
    const clear = document.createElement('button');
    clear.type = 'button';
    clear.textContent = 'Clear list';
    const message = document.createElement('p');
    message.className = 'reading-list__message';
    message.setAttribute('role', 'status');
    message.setAttribute('aria-live', 'polite');
    const listUrl = () => {
      const url = new URL(location.pathname, location.origin);
      url.searchParams.set('list', [...savedItems.keys()].join(','));
      url.hash = 'community-projects';
      return url.href;
    };
    renderReadingList = (writeUrl = true) => {
      for (const [slug, button] of saveButtons) {
        const selected = savedItems.has(slug);
        button.textContent = selected ? 'Saved ✓' : 'Save';
        button.setAttribute('aria-pressed', String(selected));
        button.setAttribute('aria-label', `${selected ? 'Remove' : 'Save'} ${savedCatalog.get(slug).name} ${selected ? 'from' : 'to'} the reading list`);
        button.disabled = !selected && savedItems.size >= 8;
      }
      bar.hidden = savedItems.size === 0;
      bar.textContent = `Reading list · ${savedItems.size} saved · Open →`;
      empty.hidden = savedItems.size !== 0;
      copy.disabled = savedItems.size === 0;
      nativeShare.disabled = savedItems.size === 0;
      clear.disabled = savedItems.size === 0;
      list.replaceChildren();
      for (const [slug, resource] of savedItems) {
        const item = document.createElement('li');
        const body = document.createElement('div');
        const category = document.createElement('span');
        category.textContent = resource.category;
        const link = document.createElement('a');
        link.href = resource.permalink;
        link.textContent = resource.name;
        const detail = document.createElement('p');
        detail.textContent = resource.description.length > 160
          ? `${resource.description.slice(0, 157).trimEnd()}…` : resource.description;
        body.append(category, link, detail);
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.textContent = 'Remove';
        remove.setAttribute('aria-label', `Remove ${resource.name} from the reading list`);
        remove.addEventListener('click', () => {
          savedItems.delete(slug);
          renderReadingList();
          const next = dialog.querySelector('.reading-list__items button');
          if (next) next.focus();
          else close.focus();
        });
        item.append(body, remove);
        list.append(item);
      }
      if (writeUrl) {
        const url = new URL(location.href);
        if (savedItems.size) url.searchParams.set('list', [...savedItems.keys()].join(','));
        else url.searchParams.delete('list');
        history.replaceState(null, '', url);
      }
    };
    bar.addEventListener('click', () => { dialog.showModal(); close.focus(); });
    dialog.addEventListener('close', () => {
      if (bar.hidden) search.focus();
      else bar.focus();
    });
    dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
    copy.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(listUrl());
        message.textContent = 'Reading list link copied.';
      } catch {
        message.textContent = 'Copy unavailable in this browser.';
      }
    });
    nativeShare.addEventListener('click', async () => {
      try {
        await navigator.share({ title: 'Jev projects to explore', url: listUrl() });
        message.textContent = 'Reading list shared.';
      } catch (error) {
        if (error?.name !== 'AbortError') message.textContent = 'Share unavailable in this browser.';
      }
    });
    clear.addEventListener('click', () => { savedItems.clear(); renderReadingList(); close.focus(); });
    actions.append(copy, nativeShare, clear);
    dialog.append(header, intro, empty, list, actions, message);
    document.body.append(bar, dialog);
    for (const slug of (params.get('list') || '').split(',')) {
      if (savedCatalog.has(slug) && !savedItems.has(slug) && savedItems.size < 8) {
        savedItems.set(slug, savedCatalog.get(slug));
      }
    }
    renderReadingList(Boolean(params.get('list')));
  }
  let view = projectPaths.size && params.get('view') !== 'compact' ? 'gallery' : 'compact';
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
    const query = search.value.trim();
    const terms = normalizeSearch(query).split(/\s+/).filter(Boolean);
    for (const { button, value } of viewButtons) {
      button.setAttribute('aria-pressed', String(value === view));
    }
    for (const button of categoryButtons) {
      button.setAttribute('aria-pressed', String(!activeResource && button.dataset.category === select.value));
    }
    let shown = 0;
    let total = 0;
    for (const section of sections) {
      section.list.classList.toggle('resource-list--gallery', view === 'gallery');
      let visibleInSection = 0;
      const categoryMatches = !select.value || select.value === section.heading.id;
      for (const item of section.items) {
        total += 1;
        const matches = activeResource
          ? resourceItems.get(activeResource) === item
          : categoryMatches && terms.every((term) => itemText.get(item).includes(term));
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
    reset.hidden = !query && !select.value && !activeResource;
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
    if (view === 'compact' && projectPaths.size) url.searchParams.set('view', 'compact');
    else url.searchParams.delete('view');
    history.replaceState(null, '', url);
  }

  search.addEventListener('input', () => { activeResource = ''; update(); });
  select.addEventListener('change', () => { activeResource = ''; update(); });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && document.activeElement === search) {
      search.value = '';
      activeResource = '';
      update();
      search.blur();
    }
  });
  update();
  if (initialHash || activeResource) {
    const restoreInitialPosition = () => {
      if (location.hash !== initialHash) return;
      const target = activeResource ? resourceItems.get(activeResource) : document.querySelector(':target');
      target?.scrollIntoView({ block: activeResource ? 'center' : 'start', behavior: 'instant' });
    };
    const afterLayout = () => requestAnimationFrame(restoreInitialPosition);
    if (document.readyState === 'complete') afterLayout();
    else window.addEventListener('load', afterLayout, { once: true });
  }
})();
