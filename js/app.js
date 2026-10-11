import { h, clear } from './ui.js';
import home from './pages/home.js';
import calc from './pages/calc.js';
import venn from './pages/venn.js';
import demorgan from './pages/demorgan.js';
import boolean from './pages/boolean.js';
import subsets from './pages/subsets.js';
import counting from './pages/counting.js';
import more from './pages/more.js';
import practice from './pages/practice.js';
import glossary from './pages/glossary.js';

const PAGES = [home, calc, venn, demorgan, boolean, subsets, counting, more, practice, glossary];
const main = document.getElementById('main');
const nav = document.getElementById('nav');
const menuButton = document.getElementById('menu');

const links = PAGES.map((p, i) => h('a', { href: `#/${p.id}`, class: 'nav-link' }, h('span', { class: 'nav-num' }, String(i + 1)), p.title));
nav.append(...links);

function route() {
  const id = location.hash.replace(/^#\/?/, '');
  const index = Math.max(0, PAGES.findIndex((p) => p.id === id));
  const page = PAGES[index];
  links.forEach((l, i) => { l.classList.toggle('nav-on', i === index); i === index ? l.setAttribute('aria-current', 'page') : l.removeAttribute('aria-current'); });
  document.title = `${page.title} · Set Theory Lab`;
  document.body.classList.remove('nav-open');
  menuButton.setAttribute('aria-expanded', 'false');
  clear(main);
  try {
    page.render(main);
  } catch (e) {
    console.error(e);
    main.append(h('div', { class: 'note note-error' }, 'Something went wrong showing this page. Try reloading.'));
  }
  const prev = PAGES[index - 1], next = PAGES[index + 1];
  main.append(h('nav', { class: 'pager no-print', 'aria-label': 'Previous and next page' },
    prev ? h('a', { class: 'btn', href: `#/${prev.id}` }, `← ${prev.title}`) : h('span', {}),
    next ? h('a', { class: 'btn btn-primary', href: `#/${next.id}` }, `Next: ${next.title} →`) : h('span', {})));
  window.scrollTo(0, 0);
  main.focus({ preventScroll: true });
}

menuButton.addEventListener('click', () => {
  const open = document.body.classList.toggle('nav-open');
  menuButton.setAttribute('aria-expanded', String(open));
});

const THEME = 'settheory-theme';
const themeButton = document.getElementById('theme');
const stored = (() => { try { return localStorage.getItem(THEME); } catch { return null; } })();
if (stored) document.documentElement.dataset.theme = stored;
themeButton.addEventListener('click', () => {
  const dark = document.documentElement.dataset.theme
    ? document.documentElement.dataset.theme === 'dark'
    : matchMedia('(prefers-color-scheme: dark)').matches;
  const nextTheme = dark ? 'light' : 'dark';
  document.documentElement.dataset.theme = nextTheme;
  try { localStorage.setItem(THEME, nextTheme); } catch { /* storage unavailable */ }
});

window.addEventListener('hashchange', route);
route();
