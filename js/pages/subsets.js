import { h, pageHeader, card, textInput, field, chips, errorBox, note, clear, live } from '../ui.js';
import { parseSet, formatSet, subsetCheck, powerSet } from '../core/sets.js';

const MAX_POWER = 6;

function checker() {
  const a = textInput('2, 4'), b = textInput('1, 2, 3, 4, 5');
  const out = h('div', {});
  const run = () => {
    clear(out);
    try {
      const A = parseSet(a.value), B = parseSet(b.value);
      const ab = subsetCheck(A, B), ba = subsetCheck(B, A);
      const verdict = ab.equal ? ['A = B', 'Every element of A is in B and every element of B is in A, so they are the same set. That also means A ⊆ B and B ⊆ A — but neither is a proper subset.']
        : ab.proper ? ['A ⊂ B  (A is a proper subset of B)', `Every element of A is in B, and B has something extra (${ba.missing.join(', ')}), so A is a proper subset.`]
          : [`A ⊄ B  (A is not a subset of B)`, `${ab.missing.join(', ')} ${ab.missing.length === 1 ? 'is' : 'are'} in A but not in B. One missing element is enough to say no.`];
      out.append(
        h('div', { class: 'answer' }, h('div', { class: 'answer-label' }, 'Answer'), h('div', { class: 'math big' }, verdict[0]), h('div', {}, verdict[1])),
        h('h4', {}, 'The check: is every element of A also in B?'),
        A.length
          ? h('ol', { class: 'checks' }, A.map((x) => {
            const found = B.includes(x);
            return h('li', { class: found ? 'yes' : 'no' }, `Is ${x} in B? `, h('strong', {}, found ? 'Yes ✓' : 'No ✗ — so A is not a subset of B'));
          }))
          : note('tip', 'A is empty, so there is nothing to check — and nothing that could fail. That is why the empty set is a subset of every set: ∅ ⊆ B is always true.'),
        h('p', { class: 'muted' }, `And the other way round: B ${ba.isSubset ? '⊆' : '⊄'} A` + (ba.isSubset ? '.' : `, because ${ba.missing.join(', ')} ${ba.missing.length === 1 ? 'is' : 'are'} not in A.`)));
    } catch (e) { out.append(errorBox(e.message)); }
  };
  const el = card('Is A a subset of B?',
    h('p', {}, h('span', { class: 'math' }, 'A ⊆ B'), ' means every element of A is also in B. If B also has something A does not, A is a ', h('strong', {}, 'proper'), ' subset: ', h('span', { class: 'math' }, 'A ⊂ B'), '.'),
    chips([{ label: 'proper subset', a: '2, 4', b: '1, 2, 3, 4, 5' }, { label: 'not a subset', a: '2, 4, 9', b: '1, 2, 3, 4, 5' }, { label: 'equal sets', a: 'x, y, z', b: 'z, y, x' }, { label: 'empty set', a: '', b: '1, 2, 3' }],
      (x) => { a.value = x.a; b.value = x.b; run(); }),
    h('div', { class: 'fields' }, field('Set A', a), field('Set B', b)), out);
  live([a, b], run);
  return el;
}

function power() {
  const s = textInput('a, b, c');
  const out = h('div', {});
  const run = () => {
    clear(out);
    try {
      const S = parseSet(s.value);
      if (S.length > MAX_POWER) throw new Error(`A set with ${S.length} elements has ${2 ** S.length} subsets — too many to list. Try ${MAX_POWER} elements or fewer.`);
      const subsets = powerSet(S), n = S.length;
      const bySize = [];
      subsets.forEach((x) => (bySize[x.length] ||= []).push(x));
      out.append(
        h('div', { class: 'answer' }, h('div', { class: 'answer-label' }, 'Answer'),
          h('div', { class: 'math big' }, '|P(S)| = 2', h('sup', {}, String(n)), ` = ${subsets.length} subsets`),
          h('div', {}, n ? `Each of the ${n} element${n === 1 ? '' : 's'} is either in a subset or left out — 2 choices each: ${Array(n).fill('2').join(' × ')} = ${subsets.length}.` : 'The empty set has exactly one subset: itself.')),
        n ? h('div', {}, h('h4', {}, 'Every subset is one row of in / out choices'),
          h('div', { class: 'table-wrap' }, h('table', { class: 'table center' },
            h('thead', {}, h('tr', {}, S.map((x) => h('th', {}, `${x}?`)), h('th', { class: 'col-final' }, 'Subset'))),
            h('tbody', {}, subsets.map((sub) => h('tr', {}, S.map((x) => h('td', { class: sub.includes(x) ? 'yes' : 'no' }, sub.includes(x) ? 'in' : 'out')), h('td', { class: 'math col-final' }, formatSet(sub)))))))) : null,
        h('h4', {}, 'Grouped by size'),
        h('ul', { class: 'plain' }, bySize.map((group, k) => h('li', {}, h('strong', {}, `${k} element${k === 1 ? '' : 's'} (${group.length}): `), h('span', { class: 'math' }, group.map(formatSet).join(',  '))))),
        note('tip', `Two subsets people forget: the empty set ∅ and the whole set itself. Leave out the whole set and you have the ${subsets.length - 1} proper subsets (2ⁿ − 1).`));
    } catch (e) { out.append(errorBox(e.message)); }
  };
  const el = card('Power set: every subset of a set',
    h('p', {}, 'The ', h('strong', {}, 'power set'), ' P(S) is the set of all subsets of S.'),
    field('Set S', s, `Up to ${MAX_POWER} elements.`), out);
  live([s], run);
  return el;
}

export default {
  id: 'subsets',
  title: 'Subsets & power sets',
  render(root) {
    root.append(pageHeader('Subsets & power sets', 'A subset is a set made only from elements of another set. Check one step by step, or list every subset there is.'), checker(), power());
  },
};
