/* Enhance the static project page with clipboard actions. */
(() => {
  const share = document.querySelector('.resource-share');
  const buttons = share?.querySelector('.resource-share__buttons');
  const status = share?.querySelector('.resource-share__status');
  const canonical = document.querySelector('link[rel="canonical"]');
  const home = document.querySelector('.wordmark');
  if (!buttons || !status || !canonical || !home || !navigator.clipboard?.writeText) return;

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
  const badgeUrl = new URL('assets/listed-badge.svg', home.href).href;
  const badge = `[![Listed in Awesome Jev](${badgeUrl})](${pageUrl})`;
  buttons.prepend(
    copyButton('Copy page link', pageUrl, 'Page link copied.'),
    copyButton('Copy listing badge', badge, 'Badge Markdown copied.'),
  );
})();
