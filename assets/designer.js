/* Turn the README's synthetic question table into a local SDK code designer. */
(() => {
  const heading = document.querySelector('#shape-a-typed-question');
  if (!heading) return;

  let table = heading.nextElementSibling;
  while (table && !/^H[1-6]$/.test(table.tagName) && table.tagName !== 'TABLE') {
    table = table.nextElementSibling;
  }
  if (!table || table.tagName !== 'TABLE') return;

  const values = new Map([...table.querySelectorAll('tbody tr')].map((row) => {
    const cells = row.querySelectorAll('td');
    return [cells[0]?.textContent.trim(), cells[1]?.textContent.trim()];
  }));
  const defaults = {
    state: values.get('State text'),
    questions: {
      choice: values.get('Choice question'),
      noul: values.get('Noul question'),
      score: values.get('Score question'),
    },
    options: (values.get('Choice options') || '').split(';').map((part) => {
      const divider = part.indexOf('=');
      if (divider < 1) return ['', ''];
      return [part.slice(0, divider).trim(), part.slice(divider + 1).trim()];
    }),
    levels: (values.get('Score levels') || '').split(';').map((part) => part.trim()),
  };
  if (!defaults.state || Object.values(defaults.questions).some((value) => !value) ||
      defaults.options.length !== 3 || defaults.options.some(([name, description]) => !name || !description) ||
      defaults.levels.length !== 3 || defaults.levels.some((level) => !level)) return;

  const card = document.createElement('section');
  card.className = 'decision-designer';
  card.setAttribute('aria-label', 'Shape a typed question and copy its SDK call');
  card.innerHTML = `
    <div class="decision-designer__header">
      <span class="decision-designer__eyebrow">DECISION DESIGNER / LOCAL ONLY</span>
      <span>No API call is made here</span>
    </div>
    <div class="decision-designer__mode" role="group" aria-label="Answer shape">
      <button type="button" data-mode="choice">Choice <small>pick one</small></button>
      <button type="button" data-mode="noul">Noul <small>yes / no</small></button>
      <button type="button" data-mode="score">Score <small>ordered rubric</small></button>
    </div>
    <div class="decision-designer__grid">
      <div class="decision-designer__fields">
        <label for="designer-state">State text</label>
        <textarea id="designer-state" rows="4" maxlength="2000"></textarea>
        <label for="designer-question">Question</label>
        <input id="designer-question" type="text" maxlength="240">
        <fieldset class="decision-designer__criteria" data-criteria="choice">
          <legend>Choice options <span>label and meaning</span></legend>
          <div class="decision-designer__choice-rows"></div>
        </fieldset>
        <fieldset class="decision-designer__criteria" data-criteria="score" hidden>
          <legend>Score levels <span>lowest to highest</span></legend>
          <div class="decision-designer__score-rows"></div>
        </fieldset>
      </div>
      <div class="decision-designer__preview">
        <div class="decision-designer__preview-head">
          <strong>Runnable JavaScript</strong>
          <span>Node.js 20+ · @typesafe-ai/sdk</span>
        </div>
        <pre><code></code></pre>
        <div class="decision-designer__actions">
          <button class="decision-designer__copy" type="button">Copy code</button>
          <button class="decision-designer__reset" type="button">Reset example</button>
        </div>
        <p class="decision-designer__status" role="status" aria-live="polite"></p>
      </div>
    </div>
    <p class="decision-designer__foot">Your edits stay in this browser tab. The copied program sends its state only when you run it with a TypeSafe API key. Check the output and set policy in your own code.</p>
  `;

  const stateInput = card.querySelector('#designer-state');
  const questionInput = card.querySelector('#designer-question');
  const choiceRows = card.querySelector('.decision-designer__choice-rows');
  const scoreRows = card.querySelector('.decision-designer__score-rows');
  const preview = card.querySelector('.decision-designer__preview code');
  const copy = card.querySelector('.decision-designer__copy');
  const reset = card.querySelector('.decision-designer__reset');
  const status = card.querySelector('.decision-designer__status');
  const modeButtons = [...card.querySelectorAll('[data-mode]')];
  const criteria = [...card.querySelectorAll('[data-criteria]')];

  const optionInputs = defaults.options.map((_, index) => {
    const row = document.createElement('div');
    row.className = 'decision-designer__option';
    const label = document.createElement('input');
    label.type = 'text';
    label.maxLength = 40;
    label.id = `designer-option-${index + 1}`;
    label.setAttribute('aria-label', `Option ${index + 1} label`);
    const description = document.createElement('input');
    description.type = 'text';
    description.maxLength = 140;
    description.setAttribute('aria-label', `Option ${index + 1} meaning`);
    row.append(label, description);
    choiceRows.append(row);
    return [label, description];
  });
  const levelInputs = defaults.levels.map((_, index) => {
    const row = document.createElement('div');
    row.className = 'decision-designer__level';
    const number = document.createElement('span');
    number.textContent = String(index);
    const input = document.createElement('input');
    input.type = 'text';
    input.maxLength = 100;
    input.setAttribute('aria-label', `Score level ${index} meaning`);
    row.append(number, input);
    scoreRows.append(row);
    return input;
  });

  let mode = 'choice';
  let questions = { ...defaults.questions };
  let code = '';
  const quoted = (value) => JSON.stringify(value);

  function render() {
    const state = stateInput.value.trim();
    const question = questionInput.value.trim();
    const options = optionInputs.map(([label, meaning]) => [label.value.trim(), meaning.value.trim()]);
    const levels = levelInputs.map((input) => input.value.trim());
    let error = '';
    if (!state || !question) error = 'Add state text and a question.';
    else if (mode === 'choice' && options.some(([label, meaning]) => !label || !meaning)) {
      error = 'Give all three Choice options a label and meaning.';
    } else if (mode === 'choice' && new Set(options.map(([label]) => label.toLowerCase())).size !== 3) {
      error = 'Choice labels must be distinct.';
    } else if (mode === 'score' && (levels.some((level) => !level) || new Set(levels.map((level) => level.toLowerCase())).size !== 3)) {
      error = 'Give Score three distinct, ordered levels.';
    }
    if (error) {
      code = '';
      preview.textContent = '// ' + error;
      copy.disabled = true;
      status.textContent = error;
      return;
    }

    let answer;
    if (mode === 'choice') {
      const criteriaLines = options.map(([label, meaning]) => `        ${quoted(label)}: ${quoted(meaning)},`).join('\n');
      answer = `    decision: choice(${quoted(question)}, {\n${criteriaLines}\n    }),`;
    } else if (mode === 'noul') {
      answer = `    decision: noul(${quoted(question)}),`;
    } else {
      const levelLines = levels.map((level) => `      ${quoted(level)},`).join('\n');
      answer = `    decision: score(${quoted(question)}, [\n${levelLines}\n    ]),`;
    }
    const output = mode === 'choice'
      ? 'console.log(answers.decision.choice, answers.decision.probabilities);'
      : mode === 'noul'
        ? 'console.log(answers.decision.noul);'
        : 'console.log(answers.decision.score, answers.decision.legend);';
    code = [
      `import { ${mode}, TypeSafeClient } from '@typesafe-ai/sdk';`,
      '',
      'const { answers } = await new TypeSafeClient().systemOne({',
      `  state: { text: ${quoted(state)} },`,
      '  questions: {',
      answer,
      '  },',
      '});',
      '',
      output,
      '',
    ].join('\n');
    preview.textContent = code;
    copy.disabled = false;
    status.textContent = '';
  }

  function selectMode(next) {
    questions[mode] = questionInput.value;
    mode = next;
    questionInput.value = questions[mode];
    for (const button of modeButtons) button.setAttribute('aria-pressed', String(button.dataset.mode === mode));
    for (const fieldset of criteria) fieldset.hidden = fieldset.dataset.criteria !== mode;
    render();
  }

  function restore() {
    stateInput.value = defaults.state;
    questions = { ...defaults.questions };
    optionInputs.forEach(([label, meaning], index) => {
      [label.value, meaning.value] = defaults.options[index];
    });
    levelInputs.forEach((input, index) => { input.value = defaults.levels[index]; });
    mode = 'choice';
    questionInput.value = questions.choice;
    for (const button of modeButtons) button.setAttribute('aria-pressed', String(button.dataset.mode === mode));
    for (const fieldset of criteria) fieldset.hidden = fieldset.dataset.criteria !== mode;
    render();
  }

  modeButtons.forEach((button) => button.addEventListener('click', () => selectMode(button.dataset.mode)));
  card.addEventListener('input', render);
  copy.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(code);
      status.textContent = 'Code copied. Run it only with data you can send to TypeSafe.';
    } catch {
      status.textContent = 'Clipboard unavailable. Select the code above to copy it.';
    }
  });
  reset.addEventListener('click', restore);
  restore();
  table.after(card);
  table.hidden = true;
})();
