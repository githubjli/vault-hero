# Vault Hero / GoldHero

`GoldHero` is a standalone, static Hero component for the BGV landing page. It injects its markup into a single mount element, scopes its styles to `#gold-hero`, and keeps the Three.js coin animation logic inside `src/GoldHero.js`.

## Project structure

```text
vault-hero/
├── index.html          # third-party usage example / quick preview
├── src/
│   ├── GoldHero.js     # component source
│   └── GoldHero.css    # component styles
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

Open `index.html` for a minimal preview of the same integration.

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

- <http://127.0.0.1:4173/index.html>

Run syntax checks:

```bash
node --check src/GoldHero.js
```

## Notes

- `src/GoldHero.css` only contains Hero component styles scoped under `#gold-hero`.
- `src/GoldHero.js` loads Three.js from CDN and dynamically loads optional particle/fallback libraries at runtime.
- `assets/` contains example imagery for preview and default asset resolution.
