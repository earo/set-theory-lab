import { h, pageHeader, card, textInput, field, keypad, chips, BOOL_KEYS, SET_KEYS, stepPlayer, errorBox, note, clear, tabs } from '../ui.js';
import { parse, format, evaluate, variables, subexpressions, assignments, ExprError } from '../core/expr.js';
import { simplify, LAWS } from '../core/simplify.js';

const MAX_VARS = 5;
const tf = (v) => h('td', { class: v ? 'yes' : 'no' }, v ? 'T' : 'F');
const VAR_KEYS = [['p', 'p'], ['q', 'q'], ['r', 'r']];

function checkVars(vars) {
  if (vars.length > MAX_VARS) throw new ExprError(`That uses ${vars.length} different letters, which needs ${2 ** vars.length} rows. Keep it to ${MAX_VARS} letters or fewer.`);
}

function truthTab(panel) {
  const expr = textInput('¬(p ∧ q)', { class: 'expr-input', 'aria-label': 'Logic expression' });
  const out = h('div', {});
  const run = () => {
    clear(out);
    try {
      const ast = parse(expr.value, 'bool');
      const vars = variables(ast);
      checkVars(vars);
      const subs = subexpressions(ast);
      const cols = subs.length ? subs : [ast];
      const rows = assignments(vars);
      const finals = rows.map((env) => evaluate(ast, env));
      const kind = finals.every(Boolean) ? ['Tautology', 'It is true in every row — it can never be false.']
        : finals.some(Boolean) ? ['Contingency', 'It is true in some rows and false in others — it depends on the inputs.']
          : ['Contradiction', 'It is false in every row — it can never be true.'];
      out.append(
        card('Truth table',
          h('p', {}, `${vars.length} letter${vars.length === 1 ? '' : 's'} → 2`, h('sup', {}, String(vars.length)), ` = ${rows.length} row${rows.length === 1 ? '' : 's'}, one for every combination of true (T) and false (F). `,
            subs.length > 1 ? 'Each column is one small piece of the expression, worked out from the columns to its left. The last column is the whole thing.' : ''),
          h('div', { class: 'table-wrap' }, h('table', { class: 'table center' },
            h('thead', {}, h('tr', {}, vars.map((v) => h('th', {}, v)), cols.map((c, i) => h('th', { class: i === cols.length - 1 ? 'col-final' : '' }, format(c, 'bool'))))),
            h('tbody', {}, rows.map((env) => h('tr', {}, vars.map((v) => tf(env[v])), cols.map((c, i) => {
              const cell = tf(evaluate(c, env));
              if (i === cols.length - 1) cell.classList.add('col-final');
              return cell;
            }))))))),
        note('ok', h('strong', {}, kind[0] + '. '), kind[1]));
    } catch (e) { out.append(errorBox(e.message)); }
  };
  expr.addEventListener('input', run);
  panel.append(card('Type a logic expression',
    chips(['¬p', 'p ∧ q', 'p ∨ q', 'p ⊕ q', 'p → q', '¬(p ∧ q)', 'p ∨ ¬p', '(p → q) ∧ (q → r)'], (x) => { expr.value = x; run(); }),
    expr, keypad(expr, BOOL_KEYS, VAR_KEYS),
    h('p', { class: 'muted small' }, 'You can type the words not, and, or — or use ~ for ¬, & for ∧, | for ∨ and -> for →.')), out);
  run();
}

function equivTab(panel) {
  const left = textInput('¬(p ∨ q)', { class: 'expr-input' }), right = textInput('¬p ∧ ¬q', { class: 'expr-input' });
  const out = h('div', {});
  const run = () => {
    clear(out);
    try {
      const a = parse(left.value, 'bool'), b = parse(right.value, 'bool');
      const vars = [...new Set([...variables(a), ...variables(b)])].sort();
      checkVars(vars);
      const rows = assignments(vars).map((env) => ({ env, x: evaluate(a, env), y: evaluate(b, env) }));
      const bad = rows.find((r) => r.x !== r.y);
      out.append(
        bad
          ? note('error', h('strong', {}, 'Not equivalent. '), `They disagree when ${vars.map((v) => `${v} is ${bad.env[v] ? 'true' : 'false'}`).join(' and ')}: the first is ${bad.x ? 'true' : 'false'} but the second is ${bad.y ? 'true' : 'false'}. One disagreeing row is enough.`)
          : note('ok', h('strong', {}, 'Equivalent ✓ '), `The two columns match in all ${rows.length} rows, so ${format(a, 'bool')} ≡ ${format(b, 'bool')}.`),
        card('Side-by-side truth table',
          h('div', { class: 'table-wrap' }, h('table', { class: 'table center' },
            h('thead', {}, h('tr', {}, vars.map((v) => h('th', {}, v)), h('th', { class: 'col-final' }, format(a, 'bool')), h('th', { class: 'col-final' }, format(b, 'bool')), h('th', {}, 'Same?'))),
            h('tbody', {}, rows.map((r) => h('tr', { class: r.x === r.y ? '' : 'row-bad' }, vars.map((v) => tf(r.env[v])), tf(r.x), tf(r.y), h('td', {}, r.x === r.y ? '✓' : '✗ different'))))))));
    } catch (e) { out.append(errorBox(e.message)); }
  };
  const pairs = [['¬(p ∨ q)', '¬p ∧ ¬q'], ['¬(p ∧ q)', '¬p ∨ ¬q'], ['p → q', '¬p ∨ q'], ['p ∧ (q ∨ r)', '(p ∧ q) ∨ (p ∧ r)'], ['¬(p ∨ q)', '¬p ∨ ¬q']];
  [left, right].forEach((i) => i.addEventListener('input', run));
  panel.append(card('Are these two expressions the same?',
    h('p', {}, 'Two expressions are ', h('strong', {}, 'equivalent'), ' (≡) when they give the same answer for every possible input.'),
    chips(pairs.map(([a, b]) => ({ label: `${a}  vs  ${b}`, a, b })), (x) => { left.value = x.a; right.value = x.b; run(); }),
    h('div', { class: 'fields' }, field('First expression', left), field('Second expression', right)),
    keypad(left, BOOL_KEYS, VAR_KEYS), h('p', { class: 'muted small' }, 'The keypad types into the first box; the second box accepts the same symbols or the words not, and, or.')), out);
  run();
}

function simplifyTab(panel) {
  let style = 'bool';
  const expr = textInput('(p ∧ q) ∨ (p ∧ ¬q)', { class: 'expr-input', 'aria-label': 'Expression to simplify' });
  const out = h('div', {}), keys = h('div', {}), examples = h('div', {});
  const EX = {
    bool: ['(p ∧ q) ∨ (p ∧ ¬q)', 'p ∨ (p ∧ q)', '¬(¬p ∨ ¬q)', 'p ∨ (¬p ∧ q)', '(p ∨ q) ∧ (p ∨ r)', '¬(p ∧ ¬q) ∧ p', 'p → (q → p)'],
    set: ['(A ∩ B) ∪ (A ∩ B′)', 'A ∪ (A ∩ B)', '(A′ ∪ B′)′', 'A ∪ (A′ ∩ B)', '(A ∪ B) ∩ (A ∪ C)', 'A − (A − B)', '(A ∩ U) ∪ ∅'],
  };
  const styleButtons = [['bool', 'Logic notation  ∧ ∨ ¬'], ['set', 'Set notation  ∩ ∪ ′']].map(([s, label]) =>
    h('button', { type: 'button', class: 'chip', onclick: () => { if (style !== s) { style = s; expr.value = EX[s][0]; } setup(); } }, label));

  function setup() {
    styleButtons.forEach((b, i) => b.classList.toggle('chip-on', (i === 0) === (style === 'bool')));
    clear(keys).append(keypad(expr, style === 'bool' ? BOOL_KEYS : SET_KEYS, style === 'bool' ? VAR_KEYS : [['A', 'A'], ['B', 'B'], ['C', 'C']]));
    clear(examples).append(chips(EX[style], (x) => { expr.value = x; run(); }));
    run();
  }

  function run() {
    clear(out);
    try {
      const ast = parse(expr.value, style);
      checkVars(variables(ast));
      const { steps, result, original } = simplify(ast);
      const F = (n) => format(n, style), eq = style === 'bool' ? '≡' : '=';
      const lawKey = style === 'bool' ? 'logic' : 'set';
      out.append(h('div', { class: 'answer' },
        h('div', { class: 'answer-label' }, steps.length ? 'Simplified' : 'Already as simple as it gets'),
        h('div', { class: 'math big' }, steps.length ? `${F(original)} ${eq} ${F(result)}` : F(result)),
        steps.length ? h('div', { class: 'muted' }, `${steps.length} step${steps.length === 1 ? '' : 's'}, each one using a single law.`) : h('div', { class: 'muted' }, 'None of the laws make this any shorter.')));
      if (steps.length) {
        out.append(card('Step by step', stepPlayer(steps.map((st) => {
          const law = LAWS[st.law];
          const forms = law[lawKey].length ? law[lawKey] : law.logic;
          return {
            title: law.name,
            body: h('div', {},
              h('div', { class: 'math rewrite' }, h('span', { class: 'muted' }, F(st.before)), h('span', { class: 'arrow' }, ` ${eq} `), h('strong', {}, F(st.after))),
              h('p', { class: 'small' }, h('span', { class: 'muted' }, 'The law: '), forms.map((f, i) => [i ? ' or ' : '', h('span', { class: 'math' }, f)])),
              h('p', { class: 'small muted' }, law.why)),
          };
        }))));
      }
    } catch (e) { out.append(errorBox(e.message)); }
  }

  expr.addEventListener('input', run);
  panel.append(card('Simplify an expression',
    h('p', {}, 'Simplifying means rewriting an expression in a shorter form that always gives the same answer. Each step uses one named law.'),
    h('div', { class: 'chips' }, styleButtons), examples, expr, keys), out);
  setup();
}

function lawsTab(panel) {
  const order = ['identity', 'domination', 'idempotent', 'complement', 'doubleNegation', 'deMorgan', 'distributive', 'absorption', 'implication', 'difference'];
  panel.append(
    card('Sets and logic are the same algebra',
      h('p', {}, 'Asking "is x in A ∪ B?" is asking "is x in A OR is x in B?". That is why every set law has a twin in logic:'),
      h('div', { class: 'table-wrap' }, h('table', { class: 'table center' },
        h('thead', {}, h('tr', {}, h('th', {}, 'Idea'), h('th', {}, 'Sets'), h('th', {}, 'Logic'), h('th', {}, 'Some textbooks write'))),
        h('tbody', {}, [['OR', '∪ union', '∨', 'p + q'], ['AND', '∩ intersection', '∧', 'p · q or pq'], ['NOT', '′ complement', '¬', 'p̄ or ~p'], ['Everything / true', 'U', '1 or T', '1'], ['Nothing / false', '∅', '0 or F', '0']]
          .map((r) => h('tr', {}, r.map((x, i) => h(i ? 'td' : 'th', { class: i ? 'math' : '' }, x)))))))),
    card('The laws',
      h('div', { class: 'table-wrap' }, h('table', { class: 'table' },
        h('thead', {}, h('tr', {}, h('th', {}, 'Law'), h('th', {}, 'In logic'), h('th', {}, 'In sets'), h('th', {}, 'Why it works'))),
        h('tbody', {}, [
          ...order.map((k) => LAWS[k]),
          { name: 'Commutative law', logic: ['p ∧ q ≡ q ∧ p', 'p ∨ q ≡ q ∨ p'], set: ['A ∩ B = B ∩ A', 'A ∪ B = B ∪ A'], why: 'Order does not matter.' },
          { name: 'Associative law', logic: ['(p ∧ q) ∧ r ≡ p ∧ (q ∧ r)', '(p ∨ q) ∨ r ≡ p ∨ (q ∨ r)'], set: ['(A ∩ B) ∩ C = A ∩ (B ∩ C)', '(A ∪ B) ∪ C = A ∪ (B ∪ C)'], why: 'Grouping does not matter when the operator is the same.' },
        ].map((law) => h('tr', {}, h('th', {}, law.name),
          h('td', { class: 'math' }, law.logic.map((x) => h('div', {}, x))),
          h('td', { class: 'math' }, law.set.length ? law.set.map((x) => h('div', {}, x)) : '—'),
          h('td', {}, law.why))))))));
}

export default {
  id: 'boolean',
  title: 'Boolean algebra',
  render(root) {
    root.append(
      pageHeader('Boolean algebra', 'Boolean algebra is arithmetic with only two values: true and false. It follows the same rules as sets, with OR for ∪, AND for ∩ and NOT for ′.'),
      tabs([{ label: 'Truth tables', render: truthTab }, { label: 'Are they equivalent?', render: equivTab }, { label: 'Simplifier', render: simplifyTab }, { label: 'Laws reference', render: lawsTab }]));
  },
};
