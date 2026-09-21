/* Share controls for README-generated project pages. */
(() => {
  const page = document.querySelector('.resource-page');
  const actions = page?.querySelector('.resource-page__actions');
  const canonical = document.querySelector('link[rel="canonical"]');
  const home = document.querySelector('.wordmark');
  const resourceName = page?.querySelector('h1')?.textContent.trim();
  const category = page?.querySelector('.resource-page__eyebrow')?.textContent.trim()
    .replace(/^Community project \/ /, '');
  const description = document.querySelector('meta[name="description"]')?.content.trim();
  if (!actions || !canonical || !home || !resourceName || !category || !description) return;

  const share = document.createElement('section');
  share.className = 'resource-share';
  share.setAttribute('aria-label', 'Share this community listing');
  const title = document.createElement('h2');
  title.textContent = 'Share this listing';
  const note = document.createElement('p');
  note.textContent = 'Maintaining this project? Share its link, badge, or image. Listed means included, not endorsed.';
  const buttons = document.createElement('div');
  buttons.className = 'resource-share__buttons';
  const status = document.createElement('span');
  status.className = 'resource-share__status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  let resetTimer;
  function report(message) {
    status.textContent = message;
    clearTimeout(resetTimer);
    resetTimer = window.setTimeout(() => { status.textContent = ''; }, 3000);
  }

  function addCopyButton(label, value, success) {
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
    buttons.append(button);
  }

  function linesFor(ctx, text, maxWidth, maxLines) {
    const words = text.replace(/\s+/g, ' ').trim().split(' ');
    const lines = [];
    let current = '';
    for (const word of words) {
      const next = current ? `${current} ${word}` : word;
      if (current && ctx.measureText(next).width > maxWidth) {
        lines.push(current);
        current = word;
      } else current = next;
    }
    if (current) lines.push(current);
    if (lines.length <= maxLines) return lines;
    const shown = lines.slice(0, maxLines);
    let last = shown[maxLines - 1];
    while (ctx.measureText(`${last}…`).width > maxWidth && last.length > 0) last = last.slice(0, -1);
    shown[maxLines - 1] = `${last.trimEnd()}…`;
    return shown;
  }

  function downloadCard() {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 630;
    const ctx = canvas.getContext('2d');
    if (!ctx) { report('Image download is unavailable in this browser.'); return; }

    ctx.fillStyle = '#111b28';
    ctx.fillRect(0, 0, 1200, 630);
    ctx.strokeStyle = '#20323d';
    ctx.lineWidth = 1;
    for (let x = 0; x <= 1200; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 630); ctx.stroke(); }
    for (let y = 0; y <= 630; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1200, y); ctx.stroke(); }
    ctx.fillStyle = 'rgba(17, 27, 40, .93)';
    ctx.fillRect(28, 28, 1144, 574);
    ctx.strokeStyle = '#4e726f';
    ctx.strokeRect(28.5, 28.5, 1143, 573);

    ctx.fillStyle = '#b9f6d6';
    ctx.beginPath(); ctx.arc(64, 68, 6, 0, 2 * Math.PI); ctx.fill();
    ctx.font = '700 17px ui-monospace, monospace';
    ctx.letterSpacing = '2px';
    ctx.fillText('AWESOME JEV / COMMUNITY LISTING', 85, 74);
    ctx.letterSpacing = '0px';
    ctx.strokeStyle = '#354c53';
    ctx.beginPath(); ctx.moveTo(48, 103); ctx.lineTo(1152, 103); ctx.stroke();

    ctx.font = '700 17px ui-monospace, monospace';
    const categoryLabel = category.toUpperCase();
    const chipWidth = Math.min(1090, ctx.measureText(categoryLabel).width + 32);
    ctx.fillStyle = '#1d383b';
    ctx.fillRect(48, 129, chipWidth, 37);
    ctx.strokeStyle = '#608d83';
    ctx.strokeRect(48.5, 129.5, chipWidth - 1, 36);
    ctx.fillStyle = '#b9f6d6';
    ctx.fillText(categoryLabel, 64, 155);

    ctx.font = '750 67px system-ui, sans-serif';
    ctx.fillStyle = '#f1f8f6';
    const titleLines = linesFor(ctx, resourceName, 1090, 2);
    const titleStart = titleLines.length === 1 ? 253 : 222;
    titleLines.forEach((line, index) => ctx.fillText(line, 48, titleStart + index * 76));

    ctx.font = '400 28px system-ui, sans-serif';
    ctx.fillStyle = '#bfd0d5';
    const summaryLines = linesFor(ctx, description, 1080, titleLines.length === 1 ? 3 : 2);
    const summaryStart = titleLines.length === 1 ? 341 : 380;
    summaryLines.forEach((line, index) => ctx.fillText(line, 48, summaryStart + index * 42));

    ctx.strokeStyle = '#354c53';
    ctx.beginPath(); ctx.moveTo(48, 529); ctx.lineTo(1152, 529); ctx.stroke();
    ctx.fillStyle = '#b9f6d6';
    ctx.font = '700 18px ui-monospace, monospace';
    ctx.fillText('abdelstark.github.io/awesome-typesafe-jev', 48, 566);
    ctx.fillStyle = '#a8b9c3';
    ctx.font = '600 16px ui-monospace, monospace';
    ctx.textAlign = 'right';
    ctx.fillText('LISTED, NOT ENDORSED', 1152, 566);

    try {
      const link = document.createElement('a');
      const slug = new URL(canonical.href).pathname.split('/').filter(Boolean).at(-1) || 'project';
      link.download = `awesome-jev-${slug}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      report('Image download started. Share it with this page link.');
    } catch {
      report('Image download is unavailable in this browser.');
    }
  }

  const pageUrl = canonical.href;
  const badgeUrl = new URL('assets/listed-badge.svg', home.href).href;
  const badge = `[![Listed in Awesome Jev](${badgeUrl})](${pageUrl})`;
  if (navigator.clipboard?.writeText) {
    addCopyButton('Copy page link', pageUrl, 'Page link copied.');
    addCopyButton('Copy listing badge', badge, 'Badge Markdown copied.');
  }
  const cardButton = document.createElement('button');
  cardButton.type = 'button';
  cardButton.textContent = 'Download share card';
  cardButton.addEventListener('click', downloadCard);
  buttons.append(cardButton);
  share.append(title, note, buttons, status);
  actions.after(share);
})();
