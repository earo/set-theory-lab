// Small DOM helpers shared by every page.

export function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'value' || k === 'checked' || k === 'disabled' || k === 'selected') el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  el.append(...kids.flat(Infinity).filter((k) => k != null && k !== false));
  return el;
}

export const clear = (el) => { el.replaceChildren(); return el; };

export function field(label, control, hint) {
  return h('label', { class: 'field' }, h('span', { class: 'field-label' }, label), control, hint && h('span', { class: 'field-hint' }, hint));
}

export const textInput = (value, attrs = {}) => h('input', { type: 'text', value, autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', ...attrs });
export const numInput = (value, attrs = {}) => h('input', { type: 'number', value, min: 0, inputmode: 'numeric', ...attrs });

export const SET_KEYS = [['∪', 'union (or)'], ['∩', 'intersection (and)'], ['′', 'complement (not)'], ['−', 'difference'], ['Δ', 'symmetric difference'], ['(', 'open bracket'], [')', 'close bracket'], ['U', 'universal set'], ['∅', 'empty set']];
export const BOOL_KEYS = [['¬', 'not'], ['∧', 'and'], ['∨', 'or'], ['⊕', 'exclusive or'], ['→', 'implies'], ['↔', 'if and only if'], ['(', 'open bracket'], [')', 'close bracket'], ['1', 'true'], ['0', 'false']];

// Buttons that type a symbol into `input` at the cursor.
export function keypad(input, keys, extra = []) {
  const press = (sym) => {
    const a = input.selectionStart ?? input.value.length, b = input.selectionEnd ?? a;
    const pad = '∪∩Δ−∧∨⊕→↔'.includes(sym) ? ` ${sym} ` : sym;
    input.value = (input.value.slice(0, a) + pad + input.value.slice(b)).replace(/ {2,}/g, ' ');
    const at = Math.min(input.value.length, a + pad.length);
    input.focus();
    input.setSelectionRange(at, at);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  };
  return h('div', { class: 'keypad', role: 'group', 'aria-label': 'Symbol keypad' },
    [...extra, ...keys].map(([sym, name]) => h('button', { type: 'button', class: 'key', title: name, 'aria-label': name, onclick: () => press(sym) }, sym)),
    h('button', { type: 'button', class: 'key key-wide', title: 'clear', onclick: () => { input.value = ''; input.focus(); input.dispatchEvent(new Event('input', { bubbles: true })); } }, 'clear'));
}

export function chips(items, onPick, label = 'Try an example') {
  return h('div', { class: 'chips' }, h('span', { class: 'chips-label' }, label + ':'),
    items.map((it) => h('button', { type: 'button', class: 'chip', onclick: () => onPick(it) }, it.label ?? it)));
}

export const errorBox = (msg) => h('div', { class: 'note note-error', role: 'alert' }, h('strong', {}, 'Hmm, check this: '), msg);
export const note = (kind, ...kids) => h('div', { class: `note note-${kind}` }, kids);
export const card = (title, ...kids) => h('section', { class: 'card' }, title && h('h3', {}, title), kids);
export const mathSpan = (text) => h('span', { class: 'math' }, text);

/**
 * A walk-through: one step visible at a time, with Back / Next / Show all.
 * steps: [{ title, body }] where body is a string or DOM node.
 * onStep(index, showingAll) fires whenever the visible step changes.
 */
export function stepPlayer(steps, onStep = () => {}) {
  let at = 0, all = false;
  const list = h('ol', { class: 'steps' });
  const status = h('span', { class: 'step-status', 'aria-live': 'polite' });
  const back = h('button', { type: 'button', class: 'btn', onclick: () => go(at - 1) }, '← Back');
  const next = h('button', { type: 'button', class: 'btn btn-primary', onclick: () => go(at + 1) }, 'Next step →');
  const showAll = h('button', { type: 'button', class: 'btn', onclick: () => { all = true; at = steps.length - 1; draw(); } }, 'Show all steps');
  const restart = h('button', { type: 'button', class: 'btn', onclick: () => { all = false; go(0); } }, 'Start over');

  steps.forEach((st, i) => {
    list.append(h('li', { class: 'step', tabindex: 0, onclick: () => { if (all || i <= at) go(i, all); } },
      h('div', { class: 'step-title' }, h('span', { class: 'step-num' }, String(i + 1)), st.title),
      h('div', { class: 'step-body' }, st.body)));
  });

  function go(i, keepAll = false) {
    all = keepAll;
    at = Math.max(0, Math.min(steps.length - 1, i));
    draw();
  }
  function draw() {
    [...list.children].forEach((li, i) => {
      li.hidden = !all && i > at;
      li.classList.toggle('step-current', i === at);
    });
    back.disabled = at === 0;
    next.disabled = at === steps.length - 1;
    next.textContent = at === steps.length - 1 ? 'Done ✓' : 'Next step →';
    status.textContent = `Step ${at + 1} of ${steps.length}`;
    onStep(at, all);
  }
  const el = h('div', { class: 'player' }, h('div', { class: 'player-bar' }, back, next, showAll, restart, status), list);
  draw();
  return el;
}

export function tabs(items) {
  const panel = h('div', { class: 'tab-panel' });
  const buttons = items.map((it, i) => h('button', { type: 'button', class: 'tab', role: 'tab', onclick: () => pick(i) }, it.label));
  function pick(i) {
    buttons.forEach((b, k) => { b.classList.toggle('tab-on', k === i); b.setAttribute('aria-selected', k === i); });
    clear(panel);
    items[i].render(panel);
  }
  const el = h('div', {}, h('div', { class: 'tabs', role: 'tablist' }, buttons), panel);
  pick(0);
  return el;
}

// Run `fn` now and again whenever any of the inputs change.
export function live(inputs, fn) {
  inputs.forEach((i) => i.addEventListener(i.type === 'checkbox' || i.tagName === 'SELECT' ? 'change' : 'input', fn));
  fn();
}

export const pageHeader = (title, lead) => h('header', { class: 'page-head' }, h('h2', {}, title), h('p', { class: 'lead' }, lead));
