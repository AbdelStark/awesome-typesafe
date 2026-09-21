/* Help visitors draft a README entry without creating a second resource source. */
(async () => {
  const heading = document.querySelector('#build-a-listing');
  const home = document.querySelector('.wordmark');
  if (!heading || !home) return;

  let directory;
  try {
    const response = await fetch(new URL('resources.json', home.href));
    if (!response.ok) return;
    directory = await response.json();
    if (!Array.isArray(directory.categories) || !directory.categories.length) return;
  } catch {
    return; // The README's contribution instructions remain available.
  }

  const builder = document.createElement('section');
  builder.className = 'listing-builder';
  builder.setAttribute('aria-label', 'Draft a community listing');
  builder.innerHTML = `
    <div class="listing-builder__head">
      <span>LISTING BUILDER / LOCAL DRAFT</span>
      <span>Nothing is submitted here</span>
    </div>
    <div class="listing-builder__grid">
      <div class="listing-builder__fields">
        <label for="listing-name">Project name</label>
        <input id="listing-name" type="text" maxlength="80" autocomplete="off" placeholder="The name visitors will recognize">
        <label for="listing-url">Canonical public URL</label>
        <input id="listing-url" type="url" maxlength="500" inputmode="url" placeholder="https://github.com/owner/project">
        <label for="listing-category">One category</label>
        <select id="listing-category"><option value="">Choose a category</option></select>
        <label for="listing-description">What it does and what readers should check</label>
        <textarea id="listing-description" rows="4" maxlength="1000" placeholder="Describe the actual Jev use, distinctive evidence, and a material limitation."></textarea>
      </div>
      <div class="listing-builder__result">
        <p class="listing-builder__label">README entry</p>
        <pre><code>Fill in the fields to preview your entry.</code></pre>
        <p class="listing-builder__placement" role="status" aria-live="polite"></p>
        <p class="listing-builder__error" role="status" aria-live="polite"></p>
        <div class="listing-builder__actions">
          <button type="button" disabled>Copy entry</button>
          <a href="https://github.com/AbdelStark/awesome-typesafe-jev/edit/main/README.md">Open README editor ↗</a>
        </div>
        <p class="listing-builder__foot">Paste under the named category, open a pull request, and disclose any affiliation. Every submission is reviewed against the contribution guide.</p>
      </div>
    </div>
  `;
  heading.after(builder);

  const nameInput = builder.querySelector('#listing-name');
  const urlInput = builder.querySelector('#listing-url');
  const categoryInput = builder.querySelector('#listing-category');
  const descriptionInput = builder.querySelector('#listing-description');
  const preview = builder.querySelector('.listing-builder__result code');
  const placement = builder.querySelector('.listing-builder__placement');
  const error = builder.querySelector('.listing-builder__error');
  const copy = builder.querySelector('button');
  let entry = '';

  for (const category of directory.categories) {
    categoryInput.add(new Option(`${category.name} (${category.resources.length})`, category.id));
  }

  const normalize = (value) => {
    try {
      const url = new URL(value);
      return url.href.replace(/\/$/, '');
    } catch {
      return '';
    }
  };
  const resources = directory.categories.flatMap((category) => category.resources);

  function update() {
    const name = nameInput.value.replace(/\s+/g, ' ').trim();
    const rawUrl = urlInput.value.trim();
    const description = descriptionInput.value.replace(/\s+/g, ' ').trim();
    const category = directory.categories.find((item) => item.id === categoryInput.value);
    const url = normalize(rawUrl);
    let issue = '';
    if (name && /[\[\]]/.test(name)) issue = 'Use a name without Markdown brackets.';
    else if (rawUrl && (!url.startsWith('https://') || /[\s)]/.test(rawUrl) || new URL(url).username || new URL(url).password)) issue = 'Use a public HTTPS URL without spaces, credentials, or a closing parenthesis.';
    else if (rawUrl && /[?&](utm_[^=]*|ref)=/i.test(rawUrl)) issue = 'Remove tracking parameters from the URL.';
    else if (url && resources.some((resource) => normalize(resource.url) === url)) issue = 'This URL is already listed. Open its existing entry to suggest a correction.';
    else if (description && !description.endsWith('.')) issue = 'End the description with a period.';

    const complete = name && url && category && description && !issue;
    entry = complete ? `- [${name}](${url}) — ${description}` : '';
    preview.textContent = entry || 'Fill in the fields to preview your entry.';
    copy.disabled = !entry || !navigator.clipboard?.writeText;
    error.textContent = issue;
    placement.textContent = '';
    if (category && name) {
      const ordered = [...category.resources].sort((a, b) => a.name.toLowerCase() < b.name.toLowerCase() ? -1 : a.name.toLowerCase() > b.name.toLowerCase() ? 1 : 0);
      const index = ordered.findIndex((resource) => resource.name.toLowerCase() > name.toLowerCase());
      const before = index < 0 ? ordered.at(-1) : ordered[index - 1];
      const after = index < 0 ? null : ordered[index];
      const position = before && after ? `after ${before.name} and before ${after.name}` : before ? `after ${before.name}` : after ? `before ${after.name}` : 'as the first entry';
      placement.textContent = `In “${category.name}”, place it ${position}.`;
    }
  }

  for (const field of [nameInput, urlInput, categoryInput, descriptionInput]) {
    field.addEventListener('input', update);
    field.addEventListener('change', update);
  }
  copy.addEventListener('click', async () => {
    if (!entry) return;
    try {
      await navigator.clipboard.writeText(entry);
      copy.textContent = 'Entry copied';
    } catch {
      copy.textContent = 'Copy unavailable';
    }
    window.setTimeout(() => { copy.textContent = 'Copy entry'; }, 2500);
  });
  update();
})();
