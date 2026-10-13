import { h, pageHeader, card, textInput, clear } from '../ui.js';

const SYMBOLS = [
  ['{ }', 'Set braces', 'the set containing…', 'A = {1, 2, 3}', 'Basics'],
  ['∈', 'Element of', '"is in"', '2 ∈ {1, 2, 3}', 'Basics'],
  ['∉', 'Not an element of', '"is not in"', '7 ∉ {1, 2, 3}', 'Basics'],
  ['∅', 'Empty set', '"the empty set"', '{1, 2} ∩ {3, 4} = ∅', 'Basics'],
  ['U', 'Universal set', '"the universal set"', 'U = all students in the class', 'Basics'],
  ['|A|  or  n(A)', 'Cardinality', '"the size of A"', '|{a, b, c}| = 3', 'Basics'],
  ['|  or  :', 'Such that', '"such that"', '{x | x > 3}', 'Basics'],
  ['∪', 'Union', '"A union B" / A or B', '{1, 2} ∪ {2, 3} = {1, 2, 3}', 'Operations'],
  ['∩', 'Intersection', '"A intersect B" / A and B', '{1, 2} ∩ {2, 3} = {2}', 'Operations'],
  ['A′  or  Aᶜ  or  Ā', 'Complement', '"A complement" / not A', 'U = {1, 2, 3}, A = {1} → A′ = {2, 3}', 'Operations'],
  ['−  or  \\', 'Difference', '"A minus B"', '{1, 2, 3} − {2} = {1, 3}', 'Operations'],
  ['Δ  or  ⊕', 'Symmetric difference', '"in exactly one of"', '{1, 2} Δ {2, 3} = {1, 3}', 'Operations'],
  ['×', 'Cartesian product', '"A cross B"', '{1, 2} × {a} = {(1, a), (2, a)}', 'Operations'],
  ['⊆', 'Subset', '"is a subset of"', '{1, 2} ⊆ {1, 2, 3}', 'Comparing sets'],
  ['⊂', 'Proper subset', '"is a proper subset of"', '{1, 2} ⊂ {1, 2, 3}, but {1, 2} ⊄ {1, 2}', 'Comparing sets'],
  ['⊄', 'Not a subset', '"is not a subset of"', '{1, 9} ⊄ {1, 2, 3}', 'Comparing sets'],
  ['=', 'Equal sets', '"equals"', '{1, 2} = {2, 1}', 'Comparing sets'],
  ['P(A)', 'Power set', '"the power set of A"', 'P({a, b}) = {∅, {a}, {b}, {a, b}}', 'Comparing sets'],
  ['¬  or  ~', 'NOT', '"not p"', '¬true = false', 'Logic'],
  ['∧', 'AND', '"p and q"', 'true ∧ false = false', 'Logic'],
  ['∨', 'OR', '"p or q"', 'true ∨ false = true', 'Logic'],
  ['⊕', 'XOR', '"p or q but not both"', 'true ⊕ true = false', 'Logic'],
  ['→', 'Implies', '"if p then q"', 'true → false = false', 'Logic'],
  ['↔', 'If and only if', '"p exactly when q"', 'false ↔ false = true', 'Logic'],
  ['≡', 'Equivalent', '"is equivalent to"', '¬(p ∧ q) ≡ ¬p ∨ ¬q', 'Logic'],
  ['ℕ', 'Natural numbers', '"the naturals"', '1, 2, 3, …', 'Number sets'],
  ['ℤ', 'Integers', '"the integers"', '…, −1, 0, 1, …', 'Number sets'],
  ['ℚ', 'Rational numbers', '"the rationals"', '1/2, −3, 0.75', 'Number sets'],
  ['ℝ', 'Real numbers', '"the reals"', '√2, π, −1.5', 'Number sets'],
  ['[a, b]  (a, b)', 'Interval', '"from a to b"', '[1, 4) means 1 ≤ x < 4', 'Number sets'],
];

export default {
  id: 'glossary',
  title: 'Symbol cheat sheet',
  render(root) {
    const search = textInput('', { placeholder: 'Search, e.g. "union" or "subset"', type: 'search', 'aria-label': 'Search symbols' });
    const out = h('div', {});
    const draw = () => {
      const q = search.value.trim().toLowerCase();
      const rows = SYMBOLS.filter((r) => !q || r.join(' ').toLowerCase().includes(q));
      const groups = [...new Set(rows.map((r) => r[4]))];
      clear(out).append(...(rows.length ? groups.map((g) => card(g,
        h('div', { class: 'table-wrap' }, h('table', { class: 'table' },
          h('thead', {}, h('tr', {}, h('th', {}, 'Symbol'), h('th', {}, 'Name'), h('th', {}, 'Say it'), h('th', {}, 'Example'))),
          h('tbody', {}, rows.filter((r) => r[4] === g).map(([sym, name, say, ex]) =>
            h('tr', {}, h('td', { class: 'math big nowrap' }, sym), h('th', {}, name), h('td', {}, say), h('td', { class: 'math' }, ex)))))))) : [h('p', {}, 'No symbols match that search.')]));
    };
    search.addEventListener('input', draw);
    root.append(
      pageHeader('Symbol cheat sheet', 'Every symbol used on this site: what it is called, how to read it aloud, and an example.'),
      h('div', { class: 'player-bar no-print' }, search, h('button', { type: 'button', class: 'btn', onclick: () => window.print() }, 'Print this page')),
      out);
    draw();
  },
};
