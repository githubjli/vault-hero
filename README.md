# Vault Hero / GoldHero

`GoldHero` is a standalone, static Hero component for the BGV landing page. It injects its own markup into a single mount element, scopes its styles to `#gold-hero`, and keeps all coin animation behavior inside `src/GoldHero.js`.

## Project structure

```text
vault-hero/
├── src/
│   ├── GoldHero.js
│   └── GoldHero.css
├── demo/
│   ├── demo.html
│   └── assets/              # local-only image files; not committed
├── screenshots/             # optional local screenshots; not committed
├── assets/                  # local/site image files
├── app.js
├── index.html
├── style.css
├── README.md
└── LICENSE
```

## Usage

Add the stylesheet, the mount element, and the module script:

```html
<link rel="stylesheet" href="src/GoldHero.css">

<div id="gold-hero"></div>

<script type="module" src="src/GoldHero.js"></script>
```

By default, `src/GoldHero.js` resolves its images from the repository-level `assets/` directory:

- `assets/bgv-main-icon_02.png`
- `assets/singapore_gold_vault.png`

If you copy the component into another project or want the demo to use local assets, provide paths on the mount element:

```html
<div
  id="gold-hero"
  data-coin-src="./assets/bgv-main-icon_02.png"
  data-vault-src="./assets/singapore_gold_vault.png"
></div>
```

## Local assets

Binary assets are intentionally not included in the component/demo patch. Copy these files locally when needed:

- `assets/bgv-main-icon_02.png`
- `assets/singapore_gold_vault.png`
- `demo/assets/bgv-main-icon_02.png`
- `demo/assets/singapore_gold_vault.png`

The main site and demo only reference these paths; image files should be managed outside this code change.

## Development

Run a local static server from the repository root:

```bash
python3 -m http.server 4173
```

Then open:

- Main site: <http://127.0.0.1:4173/index.html>
- Component demo: <http://127.0.0.1:4173/demo/demo.html>

Run syntax checks:

```bash
node --check src/GoldHero.js && node --check app.js
```

## Notes

- `app.js` remains responsible for non-Hero website logic.
- All coin animation logic is consolidated into `src/GoldHero.js`.
- `src/GoldHero.css` only contains Hero component styles scoped under `#gold-hero`.
- The component uses Three.js from CDN for WebGL rendering and loads optional particle/fallback libraries at runtime.
