// Rule-based simplifier. Every rewrite is one named law, so the output is a
// derivation a student could write out by hand, not just a final answer.

export const LAWS = {
  identity: { name: 'Identity law', logic: ['p ∧ 1 ≡ p', 'p ∨ 0 ≡ p'], set: ['A ∩ U = A', 'A ∪ ∅ = A'], why: 'Combining with "everything" (AND) or "nothing" (OR) changes nothing.' },
  domination: { name: 'Domination law', logic: ['p ∧ 0 ≡ 0', 'p ∨ 1 ≡ 1'], set: ['A ∩ ∅ = ∅', 'A ∪ U = U'], why: 'AND with false is always false; OR with true is always true.' },
  idempotent: { name: 'Idempotent law', logic: ['p ∧ p ≡ p', 'p ∨ p ≡ p'], set: ['A ∩ A = A', 'A ∪ A = A'], why: 'Repeating the same thing adds nothing new.' },
  complement: { name: 'Complement law', logic: ['p ∧ ¬p ≡ 0', 'p ∨ ¬p ≡ 1'], set: ['A ∩ A′ = ∅', 'A ∪ A′ = U'], why: 'Nothing is both in and out; everything is one or the other.' },
  constants: { name: 'Complement of a constant', logic: ['¬1 ≡ 0', '¬0 ≡ 1'], set: ['U′ = ∅', '∅′ = U'], why: 'The opposite of everything is nothing, and vice versa.' },
  doubleNegation: { name: 'Double negation law', logic: ['¬¬p ≡ p'], set: ['(A′)′ = A'], why: 'Flipping twice gets you back where you started.' },
  deMorgan: { name: "De Morgan's law", logic: ['¬(p ∧ q) ≡ ¬p ∨ ¬q', '¬(p ∨ q) ≡ ¬p ∧ ¬q'], set: ['(A ∩ B)′ = A′ ∪ B′', '(A ∪ B)′ = A′ ∩ B′'], why: 'Push the NOT inside and flip the operator.' },
  absorption: { name: 'Absorption law', logic: ['p ∨ (p ∧ q) ≡ p', 'p ∧ (p ∨ q) ≡ p'], set: ['A ∪ (A ∩ B) = A', 'A ∩ (A ∪ B) = A'], why: 'The bigger term is already covered by the smaller one.' },
  distributive: { name: 'Distributive law', logic: ['p ∧ (q ∨ r) ≡ (p ∧ q) ∨ (p ∧ r)', 'p ∨ (q ∧ r) ≡ (p ∨ q) ∧ (p ∨ r)'], set: ['A ∩ (B ∪ C) = (A ∩ B) ∪ (A ∩ C)', 'A ∪ (B ∩ C) = (A ∪ B) ∩ (A ∪ C)'], why: 'Multiply out, just like a(b + c) = ab + ac.' },
  factoring: { name: 'Distributive law (factoring)', logic: ['(p ∧ q) ∨ (p ∧ r) ≡ p ∧ (q ∨ r)'], set: ['(A ∩ B) ∪ (A ∩ C) = A ∩ (B ∪ C)'], why: 'Pull out the common part, like ab + ac = a(b + c).' },
  combine: { name: 'Distributive, then complement', logic: ['(p ∧ q) ∨ (p ∧ ¬q) ≡ p ∧ (q ∨ ¬q) ≡ p ∧ 1 ≡ p'], set: ['(A ∩ B) ∪ (A ∩ B′) = A ∩ (B ∪ B′) = A ∩ U = A'], why: 'Factor out the shared part; what is left is "q or not q", which is always true.' },
  reduce: { name: 'Distributive, then complement', logic: ['p ∨ (¬p ∧ q) ≡ (p ∨ ¬p) ∧ (p ∨ q) ≡ p ∨ q'], set: ['A ∪ (A′ ∩ B) = (A ∪ A′) ∩ (A ∪ B) = A ∪ B'], why: 'Distribute the OR; one bracket becomes "p or not p", which is always true and drops out.' },
  implication: { name: 'Implication law', logic: ['p → q ≡ ¬p ∨ q'], set: [], why: '"If p then q" only fails when p is true and q is false.' },
  biconditional: { name: 'Biconditional law', logic: ['p ↔ q ≡ (p ∧ q) ∨ (¬p ∧ ¬q)'], set: [], why: 'True exactly when both sides match.' },
  xor: { name: 'Definition of XOR / symmetric difference', logic: ['p ⊕ q ≡ (p ∧ ¬q) ∨ (¬p ∧ q)'], set: ['A Δ B = (A ∩ B′) ∪ (A′ ∩ B)'], why: 'One or the other, but not both.' },
  difference: { name: 'Definition of difference', logic: ['p − q ≡ p ∧ ¬q'], set: ['A − B = A ∩ B′'], why: 'In the first but not in the second.' },
};

const K = (v) => ({ t: 'const', v });
const N = (a) => ({ t: 'not', a });
const nary = (t, xs) => ({ t, xs });

function fromAst(a) {
  switch (a.type) {
    case 'var': return { t: 'var', n: a.name };
    case 'const': return K(a.value ? 1 : 0);
    case 'not': return N(fromAst(a.arg));
    case 'and': case 'or': return nary(a.type, [fromAst(a.left), fromAst(a.right)]);
    default: return { t: a.type, a: fromAst(a.left), b: fromAst(a.right) };
  }
}

function toAst(n) {
  switch (n.t) {
    case 'var': return { type: 'var', name: n.n };
    case 'const': return { type: 'const', value: n.v };
    case 'not': return { type: 'not', arg: toAst(n.a) };
    case 'and': case 'or': return n.xs.map(toAst).reduce((left, right) => ({ type: n.t, left, right }));
    default: return { type: n.t, left: toAst(n.a), right: toAst(n.b) };
  }
}

function key(n) {
  switch (n.t) {
    case 'var': return n.n;
    case 'const': return String(n.v);
    case 'not': return '!' + key(n.a);
    case 'and': case 'or': return `${n.t}(${n.xs.map(key).sort().join(',')})`;
    default: return `${n.t}(${key(n.a)},${key(n.b)})`;
  }
}

function size(n) {
  switch (n.t) {
    case 'var': case 'const': return 1;
    case 'not': return 1 + size(n.a);
    case 'and': case 'or': return n.xs.reduce((s, x) => s + size(x), n.xs.length - 1);
    default: return 1 + size(n.a) + size(n.b);
  }
}

// Flatten nested AND/OR chains and unwrap single-item groups. Associativity only — no meaning changes.
function norm(n) {
  if (n.t === 'not') return N(norm(n.a));
  if (n.t === 'and' || n.t === 'or') {
    const xs = n.xs.map(norm).flatMap((x) => (x.t === n.t ? x.xs : [x]));
    if (xs.length === 0) return K(n.t === 'and' ? 1 : 0);
    return xs.length === 1 ? xs[0] : nary(n.t, xs);
  }
  if (n.a) return { t: n.t, a: norm(n.a), b: norm(n.b) };
  return n;
}

const negate = (x) => (x.t === 'not' ? x.a : N(x));
// A term seen as a list of parts: p ∧ q → [p, q]; a lone p → [p].
const parts = (x, t) => (x.t === t ? x.xs : [x]);
const keys = (xs) => xs.map(key);
const subset = (a, b) => a.every((k) => b.includes(k));

function basicRule(n) {
  switch (n.t) {
    case 'imp': return { node: nary('or', [N(n.a), n.b]), law: 'implication' };
    case 'iff': return { node: nary('or', [nary('and', [n.a, n.b]), nary('and', [N(n.a), N(n.b)])]), law: 'biconditional' };
    case 'xor': return { node: nary('or', [nary('and', [n.a, N(n.b)]), nary('and', [N(n.a), n.b])]), law: 'xor' };
    case 'diff': return { node: nary('and', [n.a, N(n.b)]), law: 'difference' };
    case 'not': {
      const a = n.a;
      if (a.t === 'const') return { node: K(1 - a.v), law: 'constants' };
      if (a.t === 'not') return { node: a.a, law: 'doubleNegation' };
      if (a.t === 'and' || a.t === 'or') return { node: nary(a.t === 'and' ? 'or' : 'and', a.xs.map(N)), law: 'deMorgan' };
      return null;
    }
    case 'and': case 'or': {
      const isAnd = n.t === 'and', other = isAnd ? 'or' : 'and';
      const dominator = isAnd ? 0 : 1; // the constant that wipes out the whole group
      const ks = keys(n.xs);
      if (n.xs.some((x) => x.t === 'const' && x.v === dominator)) return { node: K(dominator), law: 'domination' };
      if (n.xs.some((x) => x.t === 'const')) return { node: nary(n.t, n.xs.filter((x) => x.t !== 'const')), law: 'identity' };
      const dup = ks.findIndex((k, i) => ks.indexOf(k) !== i);
      if (dup >= 0) return { node: nary(n.t, n.xs.filter((_, i) => i !== dup)), law: 'idempotent' };
      for (let i = 0; i < n.xs.length; i++) {
        const j = ks.indexOf(key(negate(n.xs[i])));
        if (j >= 0) {
          const rest = n.xs.filter((_, k) => k !== i && k !== j);
          rest.splice(Math.min(i, j), 0, K(dominator));
          return { node: nary(n.t, rest), law: 'complement' };
        }
      }
      for (let i = 0; i < n.xs.length; i++) {
        const small = keys(parts(n.xs[i], other));
        const j = n.xs.findIndex((x, k) => k !== i && x.t === other && subset(small, keys(x.xs)));
        if (j >= 0) return { node: nary(n.t, n.xs.filter((_, k) => k !== j)), law: 'absorption' };
      }
      return null;
    }
  }
  return null;
}

// Rules on an OR of AND-terms that need a hidden "factor out, then p ∨ ¬p = 1" step.
function mergeRule(n) {
  if (n.t !== 'or') return null;
  const terms = n.xs.map((x) => parts(x, 'and'));
  for (let i = 0; i < terms.length; i++) {
    for (let j = 0; j < terms.length; j++) {
      if (i === j) continue;
      const tj = keys(terms[j]);
      for (const lit of terms[i]) {
        const negKey = key(negate(lit));
        if (!tj.includes(negKey)) continue;
        const shared = keys(terms[i].filter((x) => x !== lit));
        if (!subset(shared, tj)) continue;
        const reduced = terms[j].filter((x) => key(x) !== negKey);
        if (terms[i].length === terms[j].length) {
          if (i > j) continue;
          const xs = n.xs.filter((_, k) => k !== j);
          xs[i] = nary('and', reduced);
          return { node: nary('or', xs), law: 'combine' };
        }
        const xs = [...n.xs];
        xs[j] = nary('and', reduced);
        return { node: nary('or', xs), law: 'reduce' };
      }
    }
  }
  return null;
}

function expandRule(n) {
  if (n.t !== 'and') return null;
  const i = n.xs.findIndex((x) => x.t === 'or');
  if (i < 0) return null;
  const terms = n.xs[i].xs.map((x) => nary('and', [...n.xs.slice(0, i), x, ...n.xs.slice(i + 1)]));
  return { node: nary('or', terms), law: 'distributive' };
}

function factorRule(n) {
  if (n.t !== 'or') return null;
  const terms = n.xs.map((x) => parts(x, 'and'));
  const common = terms[0].filter((x) => terms.every((t) => keys(t).includes(key(x))));
  if (!common.length) return null;
  const ck = keys(common);
  const rest = terms.map((t) => nary('and', t.filter((x) => !ck.includes(key(x)))));
  if (rest.some((r) => r.xs.length === 0)) return null;
  return { node: nary('and', [...common, nary('or', rest)]), law: 'factoring' };
}

// Apply a rule to the innermost, leftmost place it fits.
function rewrite(n, rule) {
  const kids = n.t === 'not' ? ['a'] : n.xs ? null : n.a ? ['a', 'b'] : [];
  if (kids === null) {
    for (let i = 0; i < n.xs.length; i++) {
      const r = rewrite(n.xs[i], rule);
      if (r) return { node: nary(n.t, n.xs.map((x, k) => (k === i ? r.node : x))), law: r.law };
    }
  } else {
    for (const k of kids) {
      const r = rewrite(n[k], rule);
      if (r) return { node: { ...n, [k]: r.node }, law: r.law };
    }
  }
  return rule(n);
}

const MAX_STEPS = 150;

export function simplify(ast) {
  let cur = norm(fromAst(ast));
  const trail = [{ node: cur }];
  const push = (r) => { cur = norm(r.node); trail.push({ node: cur, law: r.law }); };
  while (trail.length < MAX_STEPS) {
    const r = rewrite(cur, basicRule) || rewrite(cur, mergeRule) || rewrite(cur, expandRule);
    if (!r) break;
    push(r);
  }
  for (let r; trail.length < MAX_STEPS + 5 && (r = rewrite(cur, factorRule));) push(r);

  // Stop at the first point where the expression is as short as it ever gets, so we
  // never show work that only goes round in a circle.
  let best = 0;
  trail.forEach((s, i) => { if (size(s.node) < size(trail[best].node)) best = i; });
  const kept = trail.slice(0, best + 1);
  return {
    original: toAst(kept[0].node),
    result: toAst(kept[best].node),
    steps: kept.slice(1).map((s, i) => ({ law: s.law, before: toAst(kept[i].node), after: toAst(s.node) })),
  };
}
