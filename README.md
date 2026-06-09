# Vault Hero / GoldHero

`GoldHero` is a standalone, static Hero component for the BGV landing page. It injects its markup into a single mount element, scopes its styles to `#gold-hero`, and keeps the Three.js coin animation logic inside `src/GoldHero.js`.

## Project structure

```text
vault-hero/
├── index.html          # third-party usage example / quick preview
├── src/
│   ├── GoldHero.js           # full Three.js component source
│   ├── GoldHero.css          # full component styles
│   ├── GoldSimpleHero.js     # lightweight static component source
│   └── GoldSimpleHero.css    # lightweight static component styles
├── demo/
│   └── simple-demo.html # GoldSimpleHero preview
├── assets/             # example assets
│   ├── bgv-main-icon_02.png
│   ├── singapore_gold_vault.png
│   └── gold-bar.png
├── README.md
└── LICENSE
```

## Quick start

Use the component with one stylesheet, one mount element, and one module script:

```html
<link rel="stylesheet" href="src/GoldHero.css">

<div id="gold-hero"></div>

<script type="module" src="src/GoldHero.js"></script>
```

Open `index.html` for the primary `GoldSimpleHero` homepage preview, or `demo/simple-demo.html` for a standalone simple embed example.


## Simple Hero Usage

`GoldSimpleHero` is a lightweight static marketing version. It uses plain HTML, scoped CSS, and `requestAnimationFrame`; it does not require Three.js, tsParticles, coin clouds, explosions, gather animations, or gold flashes.

```html
<link rel="stylesheet" href="src/GoldSimpleHero.css">

<div
  id="gold-hero"
  data-coin-src="./assets/bgv-main-icon_02.png"
  data-vault-src="./assets/singapore_gold_vault.png"
  data-gold-bar-src="./assets/gold-bar.png"
></div>

<script type="module" src="src/GoldSimpleHero.js"></script>
```

Its animation loop is: large BGV coin → one slow 360° rotation → coin fades out while `assets/gold-bar.png` fades in → gold bar hold → reset fade → loop.

Open `demo/simple-demo.html` for a standalone preview of the simple version.


## Simple Hero Usage

`GoldSimpleHero` is a lightweight static marketing version. It uses plain HTML, scoped CSS, and `requestAnimationFrame`; it does not require Three.js, tsParticles, coin clouds, explosions, gather animations, or gold flashes.

```html
<link rel="stylesheet" href="src/GoldSimpleHero.css">

<div
  id="gold-hero"
  data-coin-src="./assets/bgv-main-icon_02.png"
  data-vault-src="./assets/singapore_gold_vault.png"
  data-gold-bar-src="./assets/gold-bar.png"
></div>

<script type="module" src="src/GoldSimpleHero.js"></script>
```

Its animation loop is: large BGV coin → one slow 360° rotation → coin fades out while `assets/gold-bar.png` fades in → gold bar hold → reset fade → loop.

Open `demo/simple-demo.html` for a standalone preview of the simple version.

## Assets

By default, `src/GoldHero.js` resolves these example assets from the repository-level `assets/` directory:

- `assets/bgv-main-icon_02.png`
- `assets/singapore_gold_vault.png`
- `assets/gold-bar.png`

If you copy the component into another project, you can override asset paths on the mount element:

```html
<div
  id="gold-hero"
  data-coin-src="./assets/bgv-main-icon_02.png"
  data-vault-src="./assets/singapore_gold_vault.png"
  data-gold-bar-src="./assets/gold-bar.png"
></div>
```

## Local development

Run a static server from the repository root:

```bash
python3 -m http.server 4173
```

Then open:

- <http://127.0.0.1:4173/index.html> (primary `GoldSimpleHero` preview)
- <http://127.0.0.1:4173/demo/simple-demo.html> (standalone simple embed example)

Run syntax checks:

```bash
node --check src/GoldHero.js
node --check src/GoldSimpleHero.js
```

## Notes

- `src/GoldHero.css` and `src/GoldSimpleHero.css` only contain component styles scoped under `#gold-hero`.
- `src/GoldHero.js` loads Three.js from CDN and dynamically loads optional particle/fallback libraries at runtime.
- `src/GoldSimpleHero.js` is plain JavaScript and does not require Three.js or tsParticles.
- `assets/` contains example imagery for preview and default asset resolution.
