/* Present the README's documented response as a visual first-visit example. */
(() => {
  const article = document.querySelector('.markdown-body');
  const source = article?.querySelector(':scope > blockquote');
  const table = source?.nextElementSibling;
  if (table?.tagName !== 'TABLE' || table.tHead?.rows[0]?.cells[0]?.textContent.trim() !== 'Input or answer') return;

  const rows = new Map([...table.tBodies[0].rows].map((row) => [
    row.cells[0]?.textContent.trim(), row.cells[1],
  ]));
  if (['State', 'Choice', 'Score', 'Noul'].some((key) => !rows.get(key)?.textContent.trim())) return;

  const section = document.createElement('section');
  section.className = 'documented-example';
  section.setAttribute('aria-labelledby', 'documented-example-title');

  const heading = document.createElement('div');
  heading.className = 'documented-example__heading';
  const eyebrow = document.createElement('span');
  eyebrow.textContent = 'DOCUMENTED RESPONSE / JEV-1.13.0';
  const title = document.createElement('h2');
  title.id = 'documented-example-title';
  title.textContent = 'One request. Three typed answers.';
  const intro = document.createElement('p');
  intro.textContent = 'A saved TypeSafe quick-start response. This page makes no model request.';
  heading.append(eyebrow, title, intro);

  const state = document.createElement('div');
  state.className = 'documented-example__state';
  const stateLabel = document.createElement('span');
  stateLabel.textContent = 'INPUT / SUPPORT MESSAGE';
  const stateText = document.createElement('p');
  stateText.textContent = rows.get('State').textContent.trim();
  state.append(stateLabel, stateText);

  const answers = document.createElement('div');
  answers.className = 'documented-example__answers';
  for (const kind of ['Choice', 'Score', 'Noul']) {
    const cell = rows.get(kind);
    const primary = cell.querySelector('code')?.textContent.trim();
    if (!primary) return;
    const answer = document.createElement('article');
    const label = document.createElement('h3');
    label.textContent = kind;
    const value = document.createElement('strong');
    value.textContent = primary;
    const detail = document.createElement('p');
    detail.textContent = cell.textContent.replace(primary, '').trim().replace(/^·\s*/, '');
    answer.append(label, value, detail);
    answers.append(answer);
  }

  const foot = document.createElement('div');
  foot.className = 'documented-example__foot';
  const next = document.createElement('p');
  next.textContent = 'Your code decides whether to route, review, or escalate.';
  const actions = document.createElement('div');
  const threshold = document.createElement('a');
  threshold.href = '#try-a-policy-threshold';
  threshold.textContent = 'Move the policy threshold →';
  const sourceLink = document.createElement('a');
  sourceLink.href = source.querySelector('a[href]')?.href || 'https://docs.typesafe.ai/introduction/quickstart';
  sourceLink.textContent = 'See the published example ↗';
  actions.append(threshold, sourceLink);
  foot.append(next, actions);

  section.append(heading, state, answers, foot);
  table.replaceWith(section);
})();
