import { h, pageHeader, card, textInput, field, errorBox, note, clear, tabs, live } from '../ui.js';
import { parseSet, formatSet, cartesian, isPrime } from '../core/sets.js';
import { s } from '../core/venn.js';

const select = (options, value) => h('select', {}, options.map(([v, label]) => h('option', { value: v, selected: v === value }, label)));
const int = (input, label) => {
  const v = Number(input.value.trim());
  if (input.value.trim() === '' || !Number.isInteger(v)) throw new Error(`"${label}" should be a whole number.`);
  return v;
};

function productTab(panel) {
  const a = textInput('1, 2, 3'), b = textInput('x, y');
  const out = h('div', {});
  live([a, b], () => {
    clear(out);
    try {
      const A = parseSet(a.value), B = parseSet(b.value);
      if (A.length * B.length > 64) throw new Error(`That would make ${A.length * B.length} pairs. Use smaller sets so the grid fits (64 pairs at most).`);
      const pairs = cartesian(A, B), pair = ([x, y]) => `(${x}, ${y})`;
      out.append(
        h('div', { class: 'answer' }, h('div', { class: 'answer-label' }, 'Answer'),
          h('div', { class: 'math big' }, `|A × B| = ${A.length} × ${B.length} = ${pairs.length} pairs`),
          h('div', { class: 'math' }, `A × B = ${pairs.length ? `{${pairs.map(pair).join(', ')}}` : '∅'}`)),
        pairs.length ? h('div', {},
          h('h4', {}, 'Build it as a grid: one row per element of A, one column per element of B'),
          h('div', { class: 'table-wrap' }, h('table', { class: 'table center' },
            h('thead', {}, h('tr', {}, h('th', {}, 'A \\ B'), B.map((y) => h('th', {}, y)))),
            h('tbody', {}, A.map((x) => h('tr', {}, h('th', {}, x), B.map((y) => h('td', { class: 'math' }, pair([x, y])))))))))
          : note('tip', 'If either set is empty there is nothing to pair up, so the product is empty.'),
        pairs.length ? note('tip', h('strong', {}, 'Order matters. '), `Each pair is (something from A, something from B). Swap the sets and the pairs flip: B × A starts with ${pair([B[0], A[0]])}, not ${pair([A[0], B[0]])}. So A × B ≠ B × A in general — but they are the same size.`) : null);
    } catch (e) { out.append(errorBox(e.message)); }
  });
  panel.append(card('Cartesian product A × B',
    h('p', {}, 'The Cartesian product pairs every element of A with every element of B. It is how a coordinate grid is made: ℝ × ℝ gives every point (x, y).'),
    h('div', { class: 'fields' }, field('Set A', a), field('Set B', b)), out));
}

const RULES = {
  any: { label: 'any integer', text: () => 'x is an integer', test: () => true },
  even: { label: 'even', text: () => 'x is even', test: (x) => x % 2 === 0 },
  odd: { label: 'odd', text: () => 'x is odd', test: (x) => Math.abs(x % 2) === 1 },
  multiple: { label: 'a multiple of k', k: true, text: (k) => `x is a multiple of ${k}`, test: (x, k) => k !== 0 && x % k === 0 },
  factor: { label: 'a factor of k', k: true, text: (k) => `x is a factor of ${k}`, test: (x, k) => x !== 0 && k % x === 0 },
  prime: { label: 'prime', text: () => 'x is prime', test: (x) => isPrime(x) },
  square: { label: 'a perfect square', text: () => 'x is a perfect square', test: (x) => x >= 0 && Number.isInteger(Math.sqrt(x)) },
};

function builderTab(panel) {
  const lo = textInput('1', { inputmode: 'numeric' }), hi = textInput('20', { inputmode: 'numeric' }), k = textInput('3', { inputmode: 'numeric' });
  const rule = select(Object.entries(RULES).map(([v, r]) => [v, r.label]), 'even');
  const kField = field('k', k), out = h('div', {});
  live([lo, hi, k, rule], () => {
    clear(out);
    const r = RULES[rule.value];
    kField.hidden = !r.k;
    try {
      const a = int(lo, 'From'), b = int(hi, 'To'), kv = r.k ? int(k, 'k') : 0;
      if (b < a) throw new Error('"From" should not be bigger than "To".');
      if (b - a > 60) throw new Error('Keep the range to about 60 numbers so every check fits on screen.');
      const all = [], kept = [];
      for (let x = a; x <= b; x++) { all.push(x); if (r.test(x, kv)) kept.push(x); }
      out.append(
        h('div', { class: 'answer' },
          h('div', { class: 'answer-label' }, 'Set-builder notation'),
          h('div', { class: 'math big' }, `{ x | ${r.text(kv)}, ${a} ≤ x ≤ ${b} }`),
          h('div', {}, 'Read it as: "the set of all x ', h('strong', {}, 'such that'), ` ${r.text(kv)} and x is between ${a} and ${b}".`),
          h('div', { class: 'answer-label' }, 'Roster form (the list)'),
          h('div', { class: 'math big' }, formatSet(kept.map(String))),
          h('div', { class: 'muted' }, `${kept.length} element${kept.length === 1 ? '' : 's'}`)),
        h('h4', {}, 'How to convert: test each number against the rule'),
        h('div', { class: 'tokens' }, all.map((x) => h('span', { class: 'token ' + (r.test(x, kv) ? 'yes' : 'no'), title: r.test(x, kv) ? 'passes the rule' : 'fails the rule' }, String(x)))),
        h('p', { class: 'muted small' }, 'Highlighted numbers pass the rule and go into the set. The rest are left out.'));
    } catch (e) { out.append(errorBox(e.message)); }
  });
  panel.append(card('Set-builder notation ↔ roster form',
    h('p', {}, h('strong', {}, 'Roster form'), ' lists the elements: {2, 4, 6}. ', h('strong', {}, 'Set-builder notation'), ' gives a rule instead: { x | x is even, 1 ≤ x ≤ 6 }. The bar | (some books use a colon) means "such that".'),
    h('div', { class: 'fields narrow' }, field('x is…', rule), kField, field('From', lo), field('To', hi)), out));
}

function numberLine(a, b, lt, rt) {
  const W = 320, y = 34, x0 = 40, x1 = 280;
  const leftInf = lt === 'inf', rightInf = rt === 'inf';
  const from = leftInf ? 8 : x0, to = rightInf ? W - 8 : x1;
  const dot = (x, type) => s('circle', { cx: x, cy: y, r: 6, class: type === 'closed' ? 'nl-dot nl-closed' : 'nl-dot nl-open' });
  const label = (x, t) => s('text', { x, y: y + 26, class: 'venn-el' }, document.createTextNode(t));
  return s('svg', { viewBox: `0 0 ${W} 70`, class: 'numberline', role: 'img' },
    s('title', {}, document.createTextNode('Number line for the interval')),
    s('line', { x1: 4, y1: y, x2: W - 4, y2: y, class: 'nl-axis' }),
    s('line', { x1: from, y1: y, x2: to, y2: y, class: 'nl-range' }),
    leftInf ? s('path', { d: `M14 ${y - 6} L4 ${y} L14 ${y + 6}`, class: 'nl-arrow' }) : dot(x0, lt),
    rightInf ? s('path', { d: `M${W - 14} ${y - 6} L${W - 4} ${y} L${W - 14} ${y + 6}`, class: 'nl-arrow' }) : dot(x1, rt),
    leftInf ? null : label(x0, String(a)), rightInf ? null : label(x1, String(b)));
}

function intervalTab(panel) {
  const a = textInput('-2', { inputmode: 'decimal' }), b = textInput('5', { inputmode: 'decimal' });
  const lt = select([['closed', '[  included (≤)'], ['open', '(  not included (<)'], ['inf', '−∞  no lower limit']], 'closed');
  const rt = select([['closed', ']  included (≤)'], ['open', ')  not included (<)'], ['inf', '∞  no upper limit']], 'open');
  const out = h('div', {});
  live([a, b, lt, rt], () => {
    clear(out);
    try {
      const L = lt.value, R = rt.value;
      const av = Number(a.value), bv = Number(b.value);
      if (L !== 'inf' && (a.value.trim() === '' || isNaN(av))) throw new Error('The left end should be a number.');
      if (R !== 'inf' && (b.value.trim() === '' || isNaN(bv))) throw new Error('The right end should be a number.');
      if (L !== 'inf' && R !== 'inf' && av >= bv) throw new Error('The left end should be smaller than the right end.');
      const notation = `${L === 'closed' ? '[' : '('}${L === 'inf' ? '−∞' : av}, ${R === 'inf' ? '∞' : bv}${R === 'closed' ? ']' : ')'}`;
      const lower = L === 'inf' ? '' : `${av} ${L === 'closed' ? '≤' : '<'} `;
      const upper = R === 'inf' ? '' : ` ${R === 'closed' ? '≤' : '<'} ${bv}`;
      const ineq = L === 'inf' && R === 'inf' ? 'x is any real number' : L === 'inf' ? `x${upper}` : R === 'inf' ? `x ${L === 'closed' ? '≥' : '>'} ${av}` : `${lower}x${upper}`;
      out.append(
        h('div', { class: 'answer' },
          h('div', { class: 'answer-label' }, 'Interval notation'), h('div', { class: 'math big' }, notation),
          h('div', { class: 'answer-label' }, 'Inequality'), h('div', { class: 'math big' }, ineq),
          h('div', { class: 'answer-label' }, 'Set-builder notation'), h('div', { class: 'math big' }, `{ x ∈ ℝ | ${ineq} }`)),
        h('div', { class: 'venn-box' }, numberLine(av, bv, L, R)),
        h('ul', { class: 'plain' },
          h('li', {}, h('strong', {}, 'Square bracket [ ] / filled dot: '), 'the endpoint is included (≤ or ≥).'),
          h('li', {}, h('strong', {}, 'Round bracket ( ) / hollow dot: '), 'the endpoint is not included (< or >).'),
          h('li', {}, h('strong', {}, 'Infinity '), 'always gets a round bracket, because you can never actually reach it.')));
    } catch (e) { out.append(errorBox(e.message)); }
  });
  panel.append(card('Intervals on the number line',
    h('p', {}, 'An interval is the set of all real numbers between two ends. There are too many to list, so we use brackets instead.'),
    h('div', { class: 'fields narrow' }, field('Left end', a), field('Left bracket', lt), field('Right end', b), field('Right bracket', rt)), out));
}

function classify(text) {
  const t = text.trim().toLowerCase().replace(/\s+/g, '');
  if (!t) throw new Error('Type a number, such as 7, -3, 0.25, 3/4, √2 or π.');
  const root = t.match(/^(?:√|sqrt\(?)(\d+)\)?$/);
  if (t === 'pi' || t === 'π' || t === 'e') return { real: true, why: `${text.trim()} is a famous irrational number: its decimals go on for ever with no repeating pattern.` };
  if (root) {
    const r = Math.sqrt(+root[1]);
    if (!Number.isInteger(r)) return { real: true, why: `${root[1]} is not a perfect square, so its square root cannot be written as a fraction.` };
    return classify(String(r));
  }
  const frac = t.match(/^(-?\d+)\/(-?\d+)$/);
  if (frac && +frac[2] === 0) throw new Error('A fraction cannot have 0 on the bottom.');
  const v = frac ? +frac[1] / +frac[2] : Number(t);
  if (isNaN(v)) throw new Error(`I can't read "${text.trim()}" as a number. Try 7, -3, 0.25, 3/4, √2 or π.`);
  const integer = Number.isInteger(v);
  return { real: true, rational: true, integer, natural: integer && v >= 1, zero: v === 0,
    why: integer ? (v >= 1 ? 'It is a positive whole number.' : v === 0 ? 'Zero is an integer. Whether it counts as a natural number depends on your textbook.' : 'It is a whole number, but negative — so it is an integer and not a natural number.')
      : 'It can be written as a fraction of two integers, but it is not a whole number.' };
}

function numbersTab(panel) {
  const x = textInput('3/4'), out = h('div', {});
  const SETS = [['natural', 'ℕ', 'Natural numbers', '1, 2, 3, … (counting numbers)'], ['integer', 'ℤ', 'Integers', '…, −2, −1, 0, 1, 2, …'], ['rational', 'ℚ', 'Rational numbers', 'anything that can be written as a fraction'], ['real', 'ℝ', 'Real numbers', 'every point on the number line']];
  live([x], () => {
    clear(out);
    try {
      const c = classify(x.value);
      out.append(h('ul', { class: 'checks' }, SETS.map(([k, sym, name]) => h('li', { class: c[k] ? 'yes' : 'no' }, h('span', { class: 'math' }, `${x.value.trim()} ${c[k] ? '∈' : '∉'} ${sym}`), ` — ${c[k] ? 'it is' : 'not'} in the ${name.toLowerCase()}`))),
        note('tip', c.why));
    } catch (e) { out.append(errorBox(e.message)); }
  });
  panel.append(
    card('The number sets',
      h('div', { class: 'table-wrap' }, h('table', { class: 'table' }, h('tbody', {}, SETS.map(([, sym, name, text]) => h('tr', {}, h('th', { class: 'math big' }, sym), h('td', {}, h('strong', {}, name)), h('td', {}, text)))))),
      h('p', {}, 'Each one sits inside the next: ', h('span', { class: 'math big' }, 'ℕ ⊂ ℤ ⊂ ℚ ⊂ ℝ'), '. Real numbers that are not rational (like √2 and π) are called ', h('strong', {}, 'irrational'), '.')),
    card('Which sets does a number belong to?', field('A number', x, 'Try 7, -3, 0, 0.25, 3/4, √2 or π'), out));
}

export default {
  id: 'more',
  title: 'Products & notation',
  render(root) {
    root.append(
      pageHeader('Products & notation', 'Other ways to build and describe sets: pairing two sets up, describing a set with a rule, and sets of numbers too big to list.'),
      tabs([{ label: 'Cartesian product', render: productTab }, { label: 'Set-builder', render: builderTab }, { label: 'Intervals', render: intervalTab }, { label: 'Number sets', render: numbersTab }]));
  },
};
