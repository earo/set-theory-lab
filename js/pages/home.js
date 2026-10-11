import { h, pageHeader, card, textInput, field, live, note, clear } from '../ui.js';
import { parseSetInfo, formatSet } from '../core/sets.js';

const TOOLS = [
  ['calc', 'Set calculator', 'Type in your own sets and watch ∪, ∩, − and ′ worked out element by element.'],
  ['venn', 'Venn diagrams', 'Shade any expression and see it built up one piece at a time.'],
  ['demorgan', "De Morgan's laws", 'See why (A ∪ B)′ and A′ ∩ B′ are the same picture.'],
  ['boolean', 'Boolean algebra', 'Truth tables, equivalence checks and law-by-law simplifying.'],
  ['subsets', 'Subsets & power sets', 'Check ⊆ step by step and list every subset of a set.'],
  ['counting', 'Counting problems', 'Solve "how many like both?" survey questions with a Venn diagram.'],
  ['more', 'Products & notation', 'Cartesian products, set-builder notation and intervals.'],
  ['practice', 'Practice', 'Random questions with hints and worked solutions.'],
  ['glossary', 'Symbol cheat sheet', 'Every symbol, how to say it, and an example.'],
];

export default {
  id: 'home',
  title: 'Start here',
  render(root) {
    const input = textInput('{red, green, blue, green}', { 'aria-label': 'A set to try' });
    const out = h('div', { class: 'result' });
    live([input], () => {
      clear(out);
      try {
        const { elements, duplicates } = parseSetInfo(input.value);
        out.append(
          h('p', {}, 'Your set: ', h('span', { class: 'math big' }, formatSet(elements))),
          h('p', {}, 'It has ', h('strong', {}, String(elements.length)), ` element${elements.length === 1 ? '' : 's'}, so its `, h('em', {}, 'cardinality'), ' is ',
            h('span', { class: 'math' }, `|A| = ${elements.length}`), '.'),
          duplicates.length ? note('tip', `You listed ${duplicates.join(', ')} more than once. A set only cares whether something is in or out, so repeats are counted once.`) : null,
          elements.length === 0 ? note('tip', 'A set with nothing in it is the empty set, written ∅ or { }.') : null);
      } catch (e) { out.append(note('error', e.message)); }
    });

    root.append(
      pageHeader('Welcome to Set Theory Lab', 'A set is just a collection of things. This site lets you play with sets and see every step, so you learn how the answer is found — not only what it is.'),
      card('The five ideas everything else is built on',
        h('dl', { class: 'ideas' },
          h('dt', {}, 'Set'), h('dd', {}, 'A collection of distinct things, written in curly braces: ', h('span', { class: 'math' }, 'A = {1, 2, 3}'), '. Order does not matter and repeats do not count.'),
          h('dt', {}, 'Element'), h('dd', {}, 'One of the things in a set. ', h('span', { class: 'math' }, '2 ∈ A'), ' means "2 is in A". ', h('span', { class: 'math' }, '7 ∉ A'), ' means "7 is not in A".'),
          h('dt', {}, 'Universal set U'), h('dd', {}, 'Everything we are talking about in a problem — for example, all the students in a class. Every other set lives inside U.'),
          h('dt', {}, 'Empty set ∅'), h('dd', {}, 'The set with nothing in it.'),
          h('dt', {}, 'Cardinality |A|'), h('dd', {}, 'How many elements a set has.'))),
      card('Try it: make a set',
        field('Type some things separated by commas', input, 'Numbers, letters or words all work. A range like 1..10 works too.'),
        out),
      card('The three operations you will use most',
        h('div', { class: 'table-wrap' }, h('table', { class: 'table' },
          h('thead', {}, h('tr', {}, h('th', {}, 'Symbol'), h('th', {}, 'Name'), h('th', {}, 'Word'), h('th', {}, 'Meaning'))),
          h('tbody', {},
            h('tr', {}, h('td', { class: 'math big' }, 'A ∪ B'), h('td', {}, 'Union'), h('td', {}, 'OR'), h('td', {}, 'Everything in A or B (or both)')),
            h('tr', {}, h('td', { class: 'math big' }, 'A ∩ B'), h('td', {}, 'Intersection'), h('td', {}, 'AND'), h('td', {}, 'Only what is in both A and B')),
            h('tr', {}, h('td', { class: 'math big' }, 'A′'), h('td', {}, 'Complement'), h('td', {}, 'NOT'), h('td', {}, 'Everything in U that is not in A'))))),
        h('p', {}, 'A memory trick: ∪ looks like a ', h('strong', {}, 'U'), ' for ', h('strong', {}, 'U'), 'nion — a cup that holds everything. ∩ looks like a bridge that only stands where both sides meet.')),
      h('h3', { class: 'section-title' }, 'Pick a tool'),
      h('div', { class: 'grid' }, TOOLS.map(([id, title, text]) =>
        h('a', { class: 'tile', href: `#/${id}` }, h('strong', {}, title), h('span', {}, text)))),
      note('tip', h('strong', {}, 'New here? '), 'Go in order: Set calculator → Venn diagrams → De Morgan\'s laws. Every tool starts with an example already filled in, so you can press "Next step" straight away.'));
  },
};
