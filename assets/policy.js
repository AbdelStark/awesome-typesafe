/* Enhance the README's support-ticket table; the README owns the example values. */
(() => {
  const heading = document.querySelector('#try-a-policy-threshold');
  if (!heading) return;

  let table = heading.nextElementSibling;
  while (table && !/^H[1-6]$/.test(table.tagName) && table.tagName !== 'TABLE') {
    table = table.nextElementSibling;
  }
  if (!table || table.tagName !== 'TABLE') return;

  const values = new Map(
    [...table.querySelectorAll('tbody tr')].map((row) => {
      const cells = row.querySelectorAll('td');
      return [cells[0]?.textContent.trim(), cells[1]?.textContent.trim()];
    }),
  );
  const team = values.get('Selected team');
  const probability = Number(values.get('Selected probability'));
  const initialThreshold = Number(values.get('Starting threshold'));
  if (!team || !Number.isFinite(probability) || probability < 0 || probability > 1 ||
      !Number.isFinite(initialThreshold) || initialThreshold < 0.5 || initialThreshold > 1) return;

  const card = document.createElement('section');
  card.className = 'policy-lab';
  card.setAttribute('aria-label', 'Try the example decision policy');
  card.innerHTML = `
    <div class="policy-lab__header">
      <span class="policy-lab__eyebrow">POLICY SANDBOX / DOCUMENTED EXAMPLE</span>
      <span class="policy-lab__fixed">Jev answer stays fixed</span>
    </div>
    <div class="policy-lab__body">
      <div class="policy-lab__signal">
        <span class="policy-lab__label">Jev selects</span>
        <strong class="policy-lab__team"></strong>
        <span class="policy-lab__probability"></span>
      </div>
      <div class="policy-lab__control">
        <label for="policy-threshold">Your auto-route threshold <output for="policy-threshold" id="policy-threshold-value"></output></label>
        <input id="policy-threshold" type="range" min="0.50" max="1.00" step="0.01">
        <div class="policy-lab__scale" aria-hidden="true"><span>50%</span><span>100%</span></div>
      </div>
      <div class="policy-lab__result" role="status" aria-live="polite">
        <span class="policy-lab__label">Your code does</span>
        <strong class="policy-lab__action"></strong>
        <span class="policy-lab__reason"></span>
      </div>
    </div>
    <p class="policy-lab__foot">This changes application policy, not Jev's answer. Choose real thresholds from your own labelled cases.</p>
  `;

  const percent = (value) => `${Math.round(value * 100)}%`;
  const range = card.querySelector('input');
  const output = card.querySelector('output');
  const result = card.querySelector('.policy-lab__result');
  card.querySelector('.policy-lab__team').textContent = team;
  card.querySelector('.policy-lab__probability').textContent = `${percent(probability)} selected probability`;
  range.value = initialThreshold.toFixed(2);

  function update() {
    const threshold = Number(range.value);
    const route = probability >= threshold;
    output.value = percent(threshold);
    result.dataset.action = route ? 'route' : 'review';
    result.querySelector('.policy-lab__action').textContent = route ? `Route to ${team}` : 'Send to review';
    result.querySelector('.policy-lab__reason').textContent = route
      ? `${percent(probability)} meets the ${percent(threshold)} threshold`
      : `${percent(probability)} is below the ${percent(threshold)} threshold`;
  }

  range.addEventListener('input', update);
  update();
  table.after(card);
  table.hidden = true;
})();
