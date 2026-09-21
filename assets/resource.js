/* Share controls for README-generated project pages. */
(() => {
  const page = document.querySelector('.resource-page');
  const actions = page?.querySelector('.resource-page__actions');
  const canonical = document.querySelector('link[rel="canonical"]');
  const home = document.querySelector('.wordmark');
  if (!actions || !canonical || !home || !navigator.clipboard?.writeText) return;

  const share = document.createElement('section');
  share.className = 'resource-share';
  share.setAttribute('aria-label', 'Share this community listing');
  const title = document.createElement('h2');
  title.textContent = 'Share this listing';
  const note = document.createElement('p');
  note.textContent = 'Maintaining this project? The badge links to this entry and means listed, not endorsed.';
  const buttons = document.createElement('div');
  buttons.className = 'resource-share__buttons';
  const status = document.createElement('span');
  status.className = 'resource-share__status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  let resetTimer;

  function addCopyButton(label, value, success) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(value);
        status.textContent = success;
      } catch {
        status.textContent = 'Copy unavailable in this browser.';
      }
      clearTimeout(resetTimer);
      resetTimer = window.setTimeout(() => { status.textContent = ''; }, 3000);
    });
    buttons.append(button);
  }

  const pageUrl = canonical.href;
  const badgeUrl = new URL('assets/listed-badge.svg', home.href).href;
  const badge = `[![Listed in Awesome Jev](${badgeUrl})](${pageUrl})`;
  addCopyButton('Copy page link', pageUrl, 'Page link copied.');
  addCopyButton('Copy listing badge', badge, 'Badge Markdown copied.');
  share.append(title, note, buttons, status);
  actions.after(share);
})();
