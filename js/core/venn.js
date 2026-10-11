// SVG Venn diagrams for 1, 2 or 3 sets. A region is a bitmask of the sets it
// lies inside: bit 0 = first set, bit 1 = second, bit 2 = third; 0 = outside all.

const NS = 'http://www.w3.org/2000/svg';
let uid = 0;

const GEO = {
  1: { w: 320, h: 240, circles: [[160, 120, 75]], names: [[88, 46]], spots: { 0: [42, 222], 1: [160, 120] } },
  2: {
    w: 320, h: 240, circles: [[125, 120, 72], [195, 120, 72]], names: [[72, 42], [248, 42]],
    spots: { 0: [42, 222], 1: [93, 120], 2: [227, 120], 3: [160, 120] },
  },
  3: {
    w: 320, h: 262, circles: [[128, 98, 60], [192, 98, 60], [160, 154, 60]], names: [[70, 36], [250, 36], [160, 238]],
    spots: { 0: [40, 244], 1: [98, 82], 2: [222, 82], 4: [160, 188], 3: [160, 70], 5: [121, 140], 6: [199, 140], 7: [160, 118] },
  },
};

export function s(tag, attrs = {}, ...kids) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v != null) el.setAttribute(k, v);
  el.append(...kids.filter((k) => k != null));
  return el;
}

export const regionCount = (n) => 1 << n;

export function regionName(mask, n, labels = ['A', 'B', 'C']) {
  const names = labels.slice(0, n);
  if (mask === 0) return n === 1 ? `outside ${names[0]}` : 'outside all sets';
  const inside = names.filter((_, i) => (mask >> i) & 1);
  if (inside.length === n) return n === 1 ? `inside ${names[0]}` : `in ${n === 2 ? 'both' : 'all three'}`;
  return `${inside.join(' and ')} only`;
}

// The set of regions an expression covers, given a way to evaluate it.
export function regionsWhere(n, test, labels = ['A', 'B', 'C']) {
  const out = new Set();
  for (let mask = 0; mask < 1 << n; mask++) {
    const env = {};
    labels.slice(0, n).forEach((name, i) => { env[name] = !!((mask >> i) & 1); });
    if (test(env)) out.add(mask);
  }
  return out;
}

function wrapText(items, perLine, maxItems) {
  const shown = items.length > maxItems ? [...items.slice(0, maxItems - 1), '…'] : items;
  const lines = [];
  for (let i = 0; i < shown.length; i += perLine) lines.push(shown.slice(i, i + perLine).join(', '));
  return lines;
}

/**
 * opts: { n, labels, shaded (Set of masks), tone ('a' | 'b' | 'c'), elements {mask: [..]},
 *         counts {mask: number}, focus (mask to ring), onRegion(mask), caption }
 */
export function renderVenn(opts) {
  const { n = 2, labels = ['A', 'B', 'C'], shaded = new Set(), tone = 'a', elements, counts, focus, onRegion, caption } = opts;
  const g = GEO[n], id = `venn${++uid}`;
  const svg = s('svg', { viewBox: `0 0 ${g.w} ${g.h}`, class: 'venn' + (onRegion ? ' venn-click' : ''), role: 'img' });
  const shadedNames = [...shaded].map((m) => regionName(m, n, labels));
  svg.append(s('title', {}, document.createTextNode(
    `${caption ? caption + '. ' : ''}Venn diagram, shaded: ${shadedNames.length ? shadedNames.join('; ') : 'nothing'}`)));

  const defs = s('defs');
  const hatch = s('pattern', { id: `${id}-hatch`, width: 7, height: 7, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' },
    s('rect', { width: 7, height: 7, class: `venn-fill tone-${tone}` }),
    s('line', { x1: 0, y1: 0, x2: 0, y2: 7, class: `venn-hatch tone-${tone}` }));
  defs.append(hatch);
  g.circles.forEach(([cx, cy, r], i) => defs.append(s('clipPath', { id: `${id}-c${i}` }, s('circle', { cx, cy, r }))));
  svg.append(defs);

  svg.append(s('rect', { x: 3, y: 3, width: g.w - 6, height: g.h - 6, rx: 10, class: 'venn-universe' }));

  for (const mask of shaded) {
    const m = s('mask', { id: `${id}-m${mask}`, maskUnits: 'userSpaceOnUse', x: 0, y: 0, width: g.w, height: g.h },
      s('rect', { width: g.w, height: g.h, fill: '#fff' }));
    g.circles.forEach(([cx, cy, r], i) => { if (!((mask >> i) & 1)) m.append(s('circle', { cx, cy, r, fill: '#000' })); });
    defs.append(m);
    let node = s('rect', { x: 3, y: 3, width: g.w - 6, height: g.h - 6, rx: 10, fill: `url(#${id}-hatch)`, mask: `url(#${id}-m${mask})` });
    g.circles.forEach((_, i) => { if ((mask >> i) & 1) node = s('g', { 'clip-path': `url(#${id}-c${i})` }, node); });
    svg.append(node);
  }

  g.circles.forEach(([cx, cy, r]) => svg.append(s('circle', { cx, cy, r, class: 'venn-circle' })));
  g.names.forEach(([x, y], i) => svg.append(s('text', { x, y, class: 'venn-name' }, document.createTextNode(labels[i]))));
  svg.append(s('text', { x: g.w - 14, y: 24, class: 'venn-u' }, document.createTextNode('U')));

  for (let mask = 0; mask < 1 << n; mask++) {
    const [x, y] = g.spots[mask];
    if (counts && counts[mask] != null) {
      svg.append(s('text', { x, y: y + 6, class: 'venn-count' + (focus === mask ? ' venn-focus' : '') }, document.createTextNode(counts[mask])));
    } else if (elements && elements[mask] && elements[mask].length) {
      const outside = mask === 0;
      const lines = wrapText(elements[mask], outside ? 12 : n === 3 ? 2 : 3, outside ? 12 : n === 3 ? 4 : 9);
      const text = s('text', { x: outside ? 12 : x, y: y - (lines.length - 1) * 6.5 + 4, class: 'venn-el' + (outside ? ' venn-el-out' : '') });
      lines.forEach((line, i) => text.append(s('tspan', { x: outside ? 12 : x, dy: i ? 13 : 0 }, document.createTextNode(line))));
      svg.append(text);
    }
  }

  if (onRegion) {
    svg.addEventListener('click', (e) => {
      const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.getScreenCTM().inverse());
      let mask = 0;
      g.circles.forEach(([cx, cy, r], i) => { if (Math.hypot(pt.x - cx, pt.y - cy) <= r) mask |= 1 << i; });
      onRegion(mask);
    });
  }
  return svg;
}
