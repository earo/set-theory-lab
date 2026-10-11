// Tokenizer, parser and evaluator shared by the set and boolean tools.
// A set expression and a boolean expression have the same shape: an element is
// in A ∪ B exactly when (in A) OR (in B), so one evaluator serves both.

export class ExprError extends Error {}

const WORD_OPS = { and: 'and', or: 'or', xor: 'xor', not: 'not' };
const CHAR_OPS = {
  '∪': 'or', '∨': 'or', '|': 'or', '+': 'or',
  '∩': 'and', '∧': 'and', '&': 'and', '*': 'and', '·': 'and', '⋅': 'and',
  'Δ': 'xor', '∆': 'xor', '△': 'xor', '⊕': 'xor', '^': 'xor',
  '−': 'diff', '-': 'diff', '\\': 'diff', '∖': 'diff',
  '→': 'imp', '⇒': 'imp', '↔': 'iff', '⇔': 'iff',
};
const NOT_CHARS = '¬~!';
const POST_CHARS = "'′’ᶜ";

const SYMBOLS = {
  set: { and: '∩', or: '∪', xor: 'Δ', diff: '−', imp: '→', iff: '↔', one: 'U', zero: '∅' },
  bool: { and: '∧', or: '∨', xor: '⊕', diff: '−', imp: '→', iff: '↔', one: '1', zero: '0' },
};

export function tokenize(src, mode = 'set') {
  const out = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (/\s/.test(ch)) { i++; continue; }
    const three = src.slice(i, i + 3), two = src.slice(i, i + 2);
    if (three === '<->' || three === '<=>') { out.push({ k: 'op', v: 'iff' }); i += 3; continue; }
    if (two === '->' || two === '=>') { out.push({ k: 'op', v: 'imp' }); i += 2; continue; }
    if (two === '{}') { out.push({ k: 'const', v: 0 }); i += 2; continue; }
    if (two === '&&' || two === '||') { out.push({ k: 'op', v: two === '&&' ? 'and' : 'or' }); i += 2; continue; }
    if (ch === '(' || ch === ')') { out.push({ k: ch }); i++; continue; }
    if (ch === '∅') { out.push({ k: 'const', v: 0 }); i++; continue; }
    if (ch === '0' || ch === '1') { out.push({ k: 'const', v: +ch }); i++; continue; }
    if (NOT_CHARS.includes(ch)) { out.push({ k: 'not' }); i++; continue; }
    if (POST_CHARS.includes(ch)) { out.push({ k: 'post' }); i++; continue; }
    if (CHAR_OPS[ch]) { out.push({ k: 'op', v: CHAR_OPS[ch] }); i++; continue; }
    if (/[A-Za-z]/.test(ch)) {
      let j = i;
      while (j < src.length && /[A-Za-z]/.test(src[j])) j++;
      const word = src.slice(i, j);
      const lower = word.toLowerCase();
      i = j;
      if (lower === 'not') out.push({ k: 'not' });
      else if (WORD_OPS[lower]) out.push({ k: 'op', v: WORD_OPS[lower] });
      else if (word.length > 1) {
        throw new ExprError(`I don't recognise "${word}". Use single letters for names (like A, B, C) and put an operator between them.`);
      } else if (mode === 'set' && word === 'U') out.push({ k: 'const', v: 1 });
      else if (mode === 'bool' && word === 'v') out.push({ k: 'op', v: 'or' });
      else out.push({ k: 'var', v: word });
      continue;
    }
    throw new ExprError(`I don't recognise the symbol "${ch}". Try the buttons above the box.`);
  }
  return out;
}

export function parse(src, mode = 'set') {
  const toks = tokenize(src, mode);
  if (!toks.length) throw new ExprError('The expression is empty. Type something like ' + (mode === 'set' ? 'A ∪ B' : 'p ∧ q') + '.');
  let pos = 0;
  const peek = () => toks[pos];
  const isOp = (...names) => peek() && peek().k === 'op' && names.includes(peek().v);
  const bin = (type, left, right) => ({ type, left, right });

  function iff() {
    let left = imp();
    while (isOp('iff')) { pos++; left = bin('iff', left, imp()); }
    return left;
  }
  function imp() {
    const left = or();
    if (isOp('imp')) { pos++; return bin('imp', left, imp()); }
    return left;
  }
  function or() {
    let left = and();
    while (isOp('or', 'xor', 'diff')) { const t = toks[pos++].v; left = bin(t, left, and()); }
    return left;
  }
  function and() {
    let left = unary();
    while (isOp('and')) { pos++; left = bin('and', left, unary()); }
    return left;
  }
  function unary() {
    if (peek() && peek().k === 'not') { pos++; return { type: 'not', arg: unary() }; }
    let node = primary();
    while (peek() && peek().k === 'post') { pos++; node = { type: 'not', arg: node }; }
    return node;
  }
  function primary() {
    const t = toks[pos];
    if (!t) throw new ExprError('The expression ends too early — something is missing after the last operator.');
    pos++;
    if (t.k === 'var') return { type: 'var', name: t.v };
    if (t.k === 'const') return { type: 'const', value: t.v };
    if (t.k === '(') {
      const inner = iff();
      if (!peek() || peek().k !== ')') throw new ExprError('A closing parenthesis ")" is missing.');
      pos++;
      return inner;
    }
    if (t.k === ')') throw new ExprError('There is a ")" with nothing before it to close.');
    throw new ExprError('An operator is in a place where a name or "(" should be. Check for two operators in a row.');
  }

  const ast = iff();
  if (pos < toks.length) {
    const t = toks[pos];
    if (t.k === ')') throw new ExprError('There is an extra ")" — every ")" needs a matching "(".');
    throw new ExprError('Two things are next to each other with no operator between them. Add one, e.g. ' + (mode === 'set' ? 'A ∩ B' : 'p ∧ q') + '.');
  }
  return ast;
}

const isBinary = (n) => n.type !== 'var' && n.type !== 'const' && n.type !== 'not';

export function format(ast, style = 'set') {
  const S = SYMBOLS[style];
  const f = (n) => {
    if (n.type === 'var') return n.name;
    if (n.type === 'const') return n.value ? S.one : S.zero;
    if (n.type === 'not') {
      const simple = !isBinary(n.arg);
      const inner = simple ? f(n.arg) : `(${f(n.arg)})`;
      return style === 'set' ? inner + '′' : '¬' + inner;
    }
    const side = (c) => {
      const chain = c.type === n.type && (n.type === 'and' || n.type === 'or');
      return isBinary(c) && !chain ? `(${f(c)})` : f(c);
    };
    return `${side(n.left)} ${S[n.type]} ${side(n.right)}`;
  };
  return f(ast);
}

export function evaluate(ast, env) {
  switch (ast.type) {
    case 'var':
      if (!(ast.name in env)) throw new ExprError(`"${ast.name}" has no value.`);
      return !!env[ast.name];
    case 'const': return !!ast.value;
    case 'not': return !evaluate(ast.arg, env);
  }
  const a = evaluate(ast.left, env), b = evaluate(ast.right, env);
  switch (ast.type) {
    case 'and': return a && b;
    case 'or': return a || b;
    case 'xor': return a !== b;
    case 'diff': return a && !b;
    case 'imp': return !a || b;
    case 'iff': return a === b;
  }
  throw new ExprError('Unknown operation.');
}

export function variables(ast) {
  const seen = new Set();
  (function walk(n) {
    if (n.type === 'var') seen.add(n.name);
    else if (n.type === 'not') walk(n.arg);
    else if (isBinary(n)) { walk(n.left); walk(n.right); }
  })(ast);
  return [...seen].sort();
}

// Every compound piece of the expression, innermost first, ending with the whole thing.
export function subexpressions(ast) {
  const out = [], seen = new Set();
  (function walk(n) {
    if (n.type === 'var' || n.type === 'const') return;
    if (n.type === 'not') walk(n.arg); else { walk(n.left); walk(n.right); }
    const key = format(n, 'bool');
    if (!seen.has(key)) { seen.add(key); out.push(n); }
  })(ast);
  return out;
}

export function usesLogicOnlyOps(ast) {
  if (ast.type === 'imp' || ast.type === 'iff') return true;
  if (ast.type === 'not') return usesLogicOnlyOps(ast.arg);
  return isBinary(ast) && (usesLogicOnlyOps(ast.left) || usesLogicOnlyOps(ast.right));
}

// All 2^n true/false assignments, counting down from all-true (the usual textbook order).
export function assignments(vars) {
  const rows = [];
  for (let i = (1 << vars.length) - 1; i >= 0; i--) {
    const env = {};
    vars.forEach((v, k) => { env[v] = !!((i >> (vars.length - 1 - k)) & 1); });
    rows.push(env);
  }
  return rows;
}

export function equivalent(a, b) {
  const vars = [...new Set([...variables(a), ...variables(b)])];
  return assignments(vars).every((env) => evaluate(a, env) === evaluate(b, env));
}

// Plain-English reading of what it takes for an element to be in the set.
export function inWords(ast) {
  const w = (n, top) => {
    const wrap = (s) => (top ? s : `(${s})`);
    switch (n.type) {
      case 'var': return `in ${n.name}`;
      case 'const': return n.value ? 'anywhere in U' : 'nowhere';
      case 'not': return n.arg.type === 'var' ? `not in ${n.arg.name}` : `not ${w(n.arg, false)}`;
      case 'and': return wrap(`${w(n.left)} and ${w(n.right)}`);
      case 'or': return wrap(`${w(n.left)} or ${w(n.right)}`);
      case 'diff': return wrap(`${w(n.left)} but not ${w(n.right)}`);
      case 'xor': return wrap(`${w(n.left)} or ${w(n.right)}, but not both`);
      case 'imp': return wrap(`if ${w(n.left)} then ${w(n.right)}`);
      case 'iff': return wrap(`${w(n.left)} exactly when ${w(n.right)}`);
    }
  };
  return w(ast, true);
}

export const OP_NAMES = {
  set: { not: 'Complement', and: 'Intersection', or: 'Union', diff: 'Difference', xor: 'Symmetric difference' },
  bool: { not: 'NOT', and: 'AND', or: 'OR', diff: 'AND NOT', xor: 'XOR', imp: 'IMPLIES', iff: 'IF AND ONLY IF' },
};
