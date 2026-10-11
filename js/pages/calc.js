import { h, pageHeader, card, textInput, field, keypad, chips, SET_KEYS, stepPlayer, errorBox, note, clear } from '../ui.js';
import { format, subexpressions, evaluate, inWords } from '../core/expr.js';
import { parseSet, formatSet, evalSet, union, difference } from '../core/sets.js';
import { renderVenn, regionsWhere } from '../core/venn.js';
import { explainElements, opTitle, parseSetExpr } from '../explain.js';

const EXAMPLES = ['A ∪ B', 'A ∩ B', 'A − B', 'B − A', 'A Δ B', 'A′', '(A ∪ B)′', 'A′ ∩ B'];
const MAX_TABLE_ROWS = 24;

export default {
  id: 'calc',
  title: 'Set calculator',
  render(root) {
    const u = textInput('1..10'), a = textInput('1, 2, 3, 4, 5'), b = textInput('4, 5, 6, 7'), c = textInput('2, 4, 6, 8');
    const useC = h('input', { type: 'checkbox' });
    const cField = field('Set C', c);
    const expr = textInput('A ∪ B', { class: 'expr-input', 'aria-label': 'Expression to work out' });
    const out = h('div', {});
    const keys = h('div', {});

    const run = () => {
      cField.hidden = !useC.checked;
      clear(keys).append(keypad(expr, SET_KEYS, [['A', 'set A'], ['B', 'set B'], ...(useC.checked ? [['C', 'set C']] : [])]));
      clear(out);
      try { out.append(solve()); } catch (e) { out.append(errorBox(e.message)); }
    };

    function solve() {
      const names = useC.checked ? ['A', 'B', 'C'] : ['A', 'B'];
      const sets = { A: parseSet(a.value), B: parseSet(b.value) };
      if (useC.checked) sets.C = parseSet(c.value);
      const everything = names.reduce((acc, n) => union(acc, sets[n]), []);
      let U = parseSet(u.value);
      const autoU = U.length === 0;
      if (autoU) U = everything;
      for (const n of names) {
        const stray = difference(sets[n], U);
        if (stray.length) throw new Error(`${stray.join(', ')} ${stray.length === 1 ? 'is' : 'are'} in ${n} but not in U. The universal set has to contain every element you use — add ${stray.length === 1 ? 'it' : 'them'} to U, or clear the U box to build U automatically.`);
      }
      const ast = parseSetExpr(expr.value, names);
      const result = evalSet(ast, sets, U);
      const subs = subexpressions(ast);
      const value = (node) => evalSet(node, sets, U);

      const elements = {};
      for (const x of U) {
        const mask = names.reduce((m, n, i) => m | (sets[n].includes(x) ? 1 << i : 0), 0);
        (elements[mask] ||= []).push(x);
      }
      const diagram = h('div', { class: 'venn-box' });
      const caption = h('p', { class: 'venn-caption' });
      const show = (node) => {
        clear(diagram).append(renderVenn({ n: names.length, shaded: regionsWhere(names.length, (env) => evaluate(node, env)), elements, caption: format(node) }));
        caption.textContent = `Shaded: ${format(node)} = ${formatSet(value(node))}`;
      };

      const steps = [{
        title: 'Write down what you know',
        body: h('div', {}, [['U', U], ...names.map((n) => [n, sets[n]])].map(([n, s]) => h('div', { class: 'math' }, `${n} = ${formatSet(s)}`)),
          subs.length > 1 ? h('p', {}, 'This expression has more than one operation, so work from the inside out — brackets first.') : null),
      }, ...subs.map((node) => {
        const operands = node.type === 'not' ? [node.arg] : [node.left, node.right];
        return {
          title: opTitle(node),
          body: h('div', {},
            h('p', {}, explainElements(node)),
            operands.filter((o) => o.type !== 'var').map((o) => h('div', { class: 'math muted' }, `${format(o)} = ${formatSet(value(o))}`)),
            h('div', { class: 'math answer-line' }, `${format(node)} = ${formatSet(value(node))}`)),
        };
      })];
      if (!subs.length) steps.push({ title: 'Nothing to work out', body: `${format(ast)} is already a set: ${formatSet(result)}.` });

      const player = stepPlayer(steps, (i) => show(i === 0 || !subs.length ? ast : subs[i - 1]));

      const rows = U.slice(0, MAX_TABLE_ROWS);
      const cols = [...names.map((n) => ({ label: n, has: (x) => sets[n].includes(x) })), ...subs.map((node) => ({ label: format(node), has: (x) => value(node).includes(x) }))];
      const table = h('div', { class: 'table-wrap' }, h('table', { class: 'table center' },
        h('thead', {}, h('tr', {}, h('th', {}, 'Element'), cols.map((col, i) => h('th', { class: i === cols.length - 1 ? 'col-final' : '' }, col.label)))),
        h('tbody', {}, rows.map((x) => h('tr', {}, h('th', {}, x), cols.map((col, i) =>
          h('td', { class: (col.has(x) ? 'yes' : 'no') + (i === cols.length - 1 ? ' col-final' : '') }, col.has(x) ? '✓ in' : '—')))))));

      return h('div', {},
        h('div', { class: 'answer' },
          h('div', { class: 'answer-label' }, 'Answer'),
          h('div', { class: 'math big' }, `${format(ast)} = ${formatSet(result)}`),
          h('div', {}, `Cardinality: |${format(ast)}| = ${result.length}`, h('span', { class: 'muted' }, ` — in words: every element that is ${inWords(ast)}.`))),
        autoU ? note('tip', `You left U empty, so U is everything in your sets: ${formatSet(U)}.`) : null,
        h('div', { class: 'split' },
          card('Step by step', player),
          card('Picture', diagram, caption, h('p', { class: 'muted small' }, 'Each element sits in the region it belongs to. The shading follows the step you are on.'))),
        card('Membership table',
          h('p', {}, 'Another way to check: go through U one element at a time and ask "is it in?" for each column. The last column is the answer.'),
          table,
          U.length > MAX_TABLE_ROWS ? h('p', { class: 'muted small' }, `Showing the first ${MAX_TABLE_ROWS} of ${U.length} elements.`) : null));
    }

    [u, a, b, c, expr].forEach((i) => i.addEventListener('input', run));
    useC.addEventListener('change', run);

    root.append(
      pageHeader('Set calculator', 'Type your own sets, choose an operation, and follow the working one step at a time.'),
      card('1. Your sets',
        h('div', { class: 'fields' },
          field('Universal set U', u, 'Everything in play. 1..10 means 1 to 10. Leave empty to build it from A and B.'),
          field('Set A', a), field('Set B', b), cField),
        h('label', { class: 'check' }, useC, ' Use a third set, C')),
      card('2. What do you want to find?',
        chips(EXAMPLES, (x) => { expr.value = x; run(); }),
        expr, keys,
        h('p', { class: 'muted small' }, 'You can also type the words or, and, not — or use + for ∪, & for ∩, - for −, and an apostrophe for ′.')),
      out);
    run();
  },
};
