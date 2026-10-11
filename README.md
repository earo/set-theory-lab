# Set Theory Lab

Step-by-step calculators and visualizers for an intro to set theory class. Every tool shows its working, so students see how an answer is found rather than just what it is.

It is a static site — plain HTML, CSS and JavaScript modules with no dependencies and no build step.

## What's inside

| Tool | What it teaches |
| --- | --- |
| **Start here** | Sets, elements, the universal set, the empty set, cardinality |
| **Set calculator** | ∪, ∩, −, Δ and complement on your own sets, element by element, with a Venn diagram and membership table |
| **Venn diagrams** | Shade any expression in A, B, C one piece at a time — or click regions and get the expression back |
| **De Morgan's laws** | Both laws built up side by side until the pictures match, plus a region table and your own sets |
| **Boolean algebra** | Truth tables, equivalence checking, a simplifier that names the law used at each step, and a laws reference |
| **Subsets & power sets** | ⊆ and ⊂ checked element by element; every subset listed with the 2ⁿ reasoning |
| **Counting problems** | Two- and three-set survey problems solved from the middle outwards (inclusion–exclusion) |
| **Products & notation** | Cartesian products, set-builder ↔ roster form, intervals, ℕ ℤ ℚ ℝ |
| **Practice** | Randomly generated questions with hints and worked solutions |
| **Symbol cheat sheet** | Every symbol, how to say it, and an example (printable) |

Expressions can be typed with the on-screen keypad or plain keys: `or` / `+` for ∪, `and` / `&` for ∩, `'` or `not` for complement, `-` for difference, `xor` for Δ, `->` and `<->` for → and ↔.

## Run it locally

Any static file server works:

```bash
python3 -m http.server 8080
```

Then open <http://localhost:8080>. Or with Docker:

```bash
docker build -t set-theory-lab .
docker run --rm -p 8080:80 set-theory-lab
```

## Deploy on Coolify

1. **New resource → Public repository** and paste this repo's URL.
2. Build pack: **Dockerfile** (the `Dockerfile` is in the repo root).
3. Port: **80**.
4. Set your domain and deploy.

The image is `nginx:alpine` serving the static files. It has a `HEALTHCHECK` against `/healthz`, which Coolify picks up automatically. There are no environment variables, volumes or databases to configure.

## Tests

The parser, set operations, simplifier and survey solvers have unit tests (Node 20+, no install needed):

```bash
node --test tests/
```

The simplifier tests check that every step it shows is logically equivalent to the original expression.

## Layout

```
index.html          app shell
css/styles.css      styles (light and dark)
js/app.js           router and navigation
js/ui.js            shared UI helpers (step player, keypad, tabs)
js/core/            expr.js (parser/evaluator), sets.js, simplify.js, venn.js (SVG)
js/pages/           one module per tool
tests/              node:test unit tests
Dockerfile          nginx image for Coolify
nginx.conf
```

## License

MIT
