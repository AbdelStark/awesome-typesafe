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
        await navigator.clipboard.writeText(value);
        report(success);
      } catch {
        report('Copy unavailable in this browser.');
      }
    });
    return button;
  }

  const pageUrl = canonical.href;
  const isProject = Boolean(document.querySelector('.resource-page'));
  if (navigator.clipboard?.writeText) {
    buttons.prepend(copyButton('Copy page link', pageUrl, 'Page link copied.'));
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
        await navigator.share({ title: document.title, url: pageUrl });
        report(isProject ? 'Project shared.' : 'Topic shared.');
      } catch (error) {
        if (error?.name !== 'AbortError') report('Share unavailable in this browser.');
      }
    });
    buttons.prepend(shareButton);
  }
})();
