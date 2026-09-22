/* Turn the README's two first-call examples into tabs on GitHub Pages. */
(() => {
  const heading = document.getElementById('make-your-first-decision');
  if (heading?.tagName !== 'H3') return;

  const sections = [];
  let current;
  for (let node = heading.nextElementSibling; node && !/^H[23]$/.test(node.tagName); node = node.nextElementSibling) {
    if (node.tagName === 'H4') {
      current = { heading: node, nodes: [] };
      sections.push(current);
    }
    if (current) current.nodes.push(node);
  }
  if (sections.length !== 2 || sections[0].heading.textContent.trim() !== 'JavaScript' ||
      sections[1].heading.textContent.trim() !== 'Python' ||
      sections.some((section) => !section.nodes.some((node) => node.tagName === 'PRE' || node.querySelector?.('pre')))) return;

  const shell = document.createElement('div');
  shell.className = 'quickstart';
  sections[0].heading.before(shell);
  const toolbar = document.createElement('div');
  toolbar.className = 'quickstart__toolbar';
  const label = document.createElement('span');
  label.className = 'quickstart__label';
  label.textContent = 'COPY A FIRST CALL';
  const tablist = document.createElement('div');
  tablist.className = 'quickstart__tabs';
  tablist.setAttribute('role', 'tablist');
  tablist.setAttribute('aria-label', 'Example language');
  const tabs = [];
  const panels = [];

  for (const [index, section] of sections.entries()) {
    const key = index === 0 ? 'javascript' : 'python';
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.id = `quickstart-tab-${key}`;
    tab.textContent = section.heading.textContent.trim();
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', `quickstart-panel-${key}`);
    const panel = document.createElement('div');
    panel.id = `quickstart-panel-${key}`;
    panel.className = 'quickstart__panel';
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', tab.id);
    panel.append(...section.nodes);
    tablist.append(tab);
    tabs.push(tab);
    panels.push(panel);
  }

  const select = (index, focus = false) => {
    tabs.forEach((tab, i) => {
      const active = i === index;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      panels[i].hidden = !active;
    });
    if (focus) tabs[index].focus();
  };
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => select(index));
    tab.addEventListener('keydown', (event) => {
      const next = event.key === 'ArrowRight' ? (index + 1) % tabs.length
        : event.key === 'ArrowLeft' ? (index + tabs.length - 1) % tabs.length
          : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : null;
      if (next === null) return;
      event.preventDefault();
      select(next, true);
    });
  });

  const matchHash = () => sections.findIndex((section) => `#${section.heading.id}` === location.hash);
  select(Math.max(matchHash(), 0));
  window.addEventListener('hashchange', () => {
    const index = matchHash();
    if (index >= 0) select(index);
  });
  toolbar.append(label, tablist);
  shell.append(toolbar, ...panels);
})();
