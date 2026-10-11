import { h, pageHeader, card, textInput, keypad, chips, SET_KEYS, stepPlayer, errorBox, note, clear, tabs } from '../ui.js';
import { format, subexpressions, evaluate, inWords, variables } from '../core/expr.js';
import { renderVenn, regionsWhere, regionName } from '../core/venn.js';
import { simplify } from '../core/simplify.js';
import { explainShading, opTitle, parseSetExpr } from '../explain.js';

const BASICS = [
  { label: 'NOT  A′', expr: 'A′' }, { label: 'AND  A ∩ B', expr: 'A ∩ B' }, { label: 'OR  A ∪ B', expr: 'A ∪ B' },
  { label: 'A − B', expr: 'A − B' }, { label: 'XOR  A Δ B', expr: 'A Δ B' },
];
const HARDER = ['(A ∪ B)′', 'A′ ∩ B′', 'A ∩ (B ∪ C)', '(A ∩ B) ∪ C', '(A ∪ B) − C', 'A′ ∩ B ∩ C′'];
const NAMES = ['A', 'B', 'C'];

function shadeTab(panel) {
  const expr = textInput('A ∩ B', { class: 'expr-input', 'aria-label': 'Expression to shade' });
  const out = h('div', {});
  const pick = (x) => { expr.value = x.expr ?? x; run(); };

  function run() {
    clear(out);
    let ast;
    try { ast = parseSetExpr(expr.value, NAMES); } catch (e) { out.append(errorBox(e.message)); return; }
    const used = variables(ast);
    const n = Math.max(1, ...used.map((v) => NAMES.indexOf(v) + 1));
    const subs = subexpressions(ast);
    const regions = (node) => regionsWhere(n, (env) => evaluate(node, env));
    const diagram = h('div', { class: 'venn-box' }), caption = h('p', { class: 'venn-caption' });
    const show = (node) => {
      clear(diagram).append(renderVenn({ n, shaded: regions(node), caption: format(node) }));
      caption.textContent = `Shaded: ${format(node)}`;
    };
    const leaves = used.length ? used : [];
    const steps = [
      ...leaves.map((v) => ({ node: { type: 'var', name: v }, title: `Find ${v}`, body: `${v} is the whole circle labelled ${v}. Everything inside the circle is in ${v}.` })),
      ...subs.map((node) => ({ node, title: opTitle(node), body: explainShading(node) })),
    ];
    if (!steps.length) steps.push({ node: ast, title: format(ast), body: ast.value ? 'U is the whole rectangle — everything.' : '∅ is the empty set — nothing is shaded.' });
    const final = regions(ast);
    const total = 1 << n;

    out.append(
      h('div', { class: 'answer' },
        h('div', { class: 'answer-label' }, 'In words'),
        h('div', {}, h('span', { class: 'math big' }, format(ast)), ' means: everything that is ', h('strong', {}, inWords(ast)), '.')),
      h('div', { class: 'split' },
        card('Picture', diagram, caption),
        card('Build it up', stepPlayer(steps, (i) => show(steps[i].node)))),
      card('Which regions ended up shaded?',
        h('p', {}, `${n} circle${n > 1 ? 's' : ''} cut the rectangle into ${total} regions. ${format(ast)} covers ${final.size} of them:`),
        h('ul', { class: 'region-list' }, [...Array(total).keys()].map((m) =>
          h('li', { class: final.has(m) ? 'yes' : 'no' }, final.has(m) ? '■ ' : '□ ', regionName(m, n)))),
        final.size === 0 ? note('tip', 'Nothing is shaded, so this expression always equals the empty set ∅.') : null,
        final.size === total ? note('tip', 'Everything is shaded, so this expression always equals the universal set U.') : null));
  }

  expr.addEventListener('input', run);
  panel.append(
    card('Type an expression, or tap an example',
      chips(BASICS, pick, 'The basics'), chips(HARDER, pick, 'A bit harder'),
      expr, keypad(expr, SET_KEYS, [['A', 'set A'], ['B', 'set B'], ['C', 'set C']]),
      h('p', { class: 'muted small' }, 'Use A, B and C. Operations inside brackets are done first; ∩ is done before ∪, − and Δ.')),
    out);
  run();
}

function reverseTab(panel) {
  let n = 2;
  const picked = new Set();
  const out = h('div', {});
  const sizeButtons = [1, 2, 3].map((k) => h('button', { type: 'button', class: 'chip', onclick: () => { n = k; picked.clear(); draw(); } }, `${k} set${k > 1 ? 's' : ''}`));

  function expression() {
    if (!picked.size) return { type: 'const', value: 0 };
    const terms = [...picked].sort((x, y) => x - y).map((mask) => NAMES.slice(0, n)
      .map((name, i) => ((mask >> i) & 1 ? { type: 'var', name } : { type: 'not', arg: { type: 'var', name } }))
      .reduce((left, right) => ({ type: 'and', left, right })));
    return terms.reduce((left, right) => ({ type: 'or', left, right }));
  }

  function draw() {
    sizeButtons.forEach((b, i) => b.classList.toggle('chip-on', i + 1 === n));
    const long = expression(), short = simplify(long).result;
    const toggle = (m) => { picked.has(m) ? picked.delete(m) : picked.add(m); draw(); };
    clear(out).append(h('div', { class: 'split' },
      card('Click regions to shade them',
        h('div', { class: 'venn-box' }, renderVenn({ n, shaded: picked, onRegion: toggle, caption: 'Clickable diagram' })),
        h('div', { class: 'chips' }, [...Array(1 << n).keys()].map((m) =>
          h('button', { type: 'button', class: 'chip' + (picked.has(m) ? ' chip-on' : ''), 'aria-pressed': picked.has(m), onclick: () => toggle(m) }, regionName(m, n))))),
      card('The expression for your shading',
        h('div', { class: 'answer' }, h('div', { class: 'answer-label' }, 'Simplest form found'), h('div', { class: 'math big' }, format(short))),
        picked.size > 1 ? h('p', {}, 'Region by region, that is: ', h('span', { class: 'math' }, format(long))) : null,
        h('p', { class: 'muted' }, picked.size
          ? 'Each shaded region is an intersection (∩) saying which circles it is inside and outside. Join the regions with ∪ to get the whole shading, then simplify.'
          : 'Nothing is shaded yet, so the set is empty. Click part of the diagram.'),
        h('a', { class: 'btn', href: `#/boolean` }, 'See simplifying step by step →'))));
  }

  panel.append(card('How many sets?', h('div', { class: 'chips' }, sizeButtons)), out);
  draw();
}

export default {
  id: 'venn',
  title: 'Venn diagrams',
  render(root) {
    root.append(
      pageHeader('Venn diagram visualizer', 'A Venn diagram draws each set as a circle inside a rectangle (the universal set U). Shading shows which part an expression is talking about.'),
      tabs([{ label: 'Expression → shading', render: shadeTab }, { label: 'Shading → expression', render: reverseTab }]));
  },
};
