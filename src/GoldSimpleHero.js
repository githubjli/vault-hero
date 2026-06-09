// ============================================================================
// BGV Simple Hero — lightweight static coin → gold bar marketing animation
//   Plain HTML/CSS/JavaScript; no Three.js, particles, coin cloud, explosion,
//   gather animation, or gold flash.
// ============================================================================

const DEFAULT_COIN_IMG = new URL('../assets/bgv-main-icon_02.png', import.meta.url).href;
const DEFAULT_VAULT_IMG = new URL('../assets/singapore_gold_vault.png', import.meta.url).href;
const DEFAULT_GOLD_BAR_IMG = new URL('../assets/gold-bar.png', import.meta.url).href;

const ROOT_ID = 'gold-hero';

const TIMINGS = {
  COIN_INTRO: 0.8,
  COIN_SPIN: 3.0,
  CROSSFADE: 1.0,
  GOLD_BAR_HOLD: 4.0,
  LOOP_RESET: 0.6
};

const TOTAL_DURATION = Object.values(TIMINGS).reduce((sum, duration) => sum + duration, 0);

function assetUrl(value, fallback) {
  return value ? new URL(value, document.baseURI).href : fallback;
}

function cssUrl(value) {
  return `url("${value.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}")`;
}

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

function smooth01(value) {
  const x = clamp01(value);
  return x * x * (3 - 2 * x);
}

function renderGoldSimpleHero(root, assets) {
  root.style.setProperty('--simple-hero-vault-image', cssUrl(assets.vault));
  root.innerHTML = `
    <section class="simple-hero-section" aria-labelledby="simple-hero-title">
      <div class="simple-hero-bg-vault" aria-hidden="true"></div>
      <div class="simple-hero-shell">
        <div class="simple-hero-content">
          <div class="simple-badge">
            <span class="simple-badge-dot" aria-hidden="true"></span>
            <span>Based in Singapore</span>
          </div>

          <h1 class="simple-hero-title" id="simple-hero-title">
            The Gold-Backed<br>
            <span>Stablecoin</span> You Trust
          </h1>

          <p class="simple-hero-subtitle">
            Blockchain Gold Vault (BGV) combines physical gold ownership with transparent digital access.
            1 GOLD-BGV is backed by exactly 1 gram of physical gold.
          </p>

          <div class="simple-hero-statement">
            <p>Real Gold. Real Ownership. Real Security.</p>
          </div>
        </div>

        <div class="simple-asset-stage" aria-hidden="true">
          <div class="simple-stage-glow"></div>
          <img class="simple-coin" src="${assets.coin}" alt="BGV Gold Stablecoin">
          <img class="simple-gold-bar" src="${assets.goldBar}" alt="Physical gold bar">
        </div>
      </div>
    </section>
  `;
}

function animationState(elapsed) {
  let cursor = 0;

  const introEnd = cursor + TIMINGS.COIN_INTRO;
  if (elapsed < introEnd) {
    const progress = smooth01(elapsed / TIMINGS.COIN_INTRO);
    return {
      coinOpacity: progress,
      coinRotateY: 0,
      coinScale: 0.88 + 0.12 * progress,
      goldBarOpacity: 0,
      goldBarScale: 0.94
    };
  }

  cursor = introEnd;
  const spinEnd = cursor + TIMINGS.COIN_SPIN;
  if (elapsed < spinEnd) {
    const progress = smooth01((elapsed - cursor) / TIMINGS.COIN_SPIN);
    return {
      coinOpacity: 1,
      coinRotateY: 360 * progress,
      coinScale: 1,
      goldBarOpacity: 0,
      goldBarScale: 0.94
    };
  }

  cursor = spinEnd;
  const crossfadeEnd = cursor + TIMINGS.CROSSFADE;
  if (elapsed < crossfadeEnd) {
    const progress = smooth01((elapsed - cursor) / TIMINGS.CROSSFADE);
    return {
      coinOpacity: 1 - progress,
      coinRotateY: 360,
      coinScale: 1 - 0.06 * progress,
      goldBarOpacity: progress,
      goldBarScale: 0.94 + 0.06 * progress
    };
  }

  cursor = crossfadeEnd;
  const holdEnd = cursor + TIMINGS.GOLD_BAR_HOLD;
  if (elapsed < holdEnd) {
    return {
      coinOpacity: 0,
      coinRotateY: 360,
      coinScale: 0.94,
      goldBarOpacity: 1,
      goldBarScale: 1
    };
  }

  cursor = holdEnd;
  const resetProgress = smooth01((elapsed - cursor) / TIMINGS.LOOP_RESET);
  return {
    coinOpacity: 0,
    coinRotateY: 0,
    coinScale: 0.88,
    goldBarOpacity: 1 - resetProgress,
    goldBarScale: 1 - 0.04 * resetProgress
  };
}

function applyAnimationFrame(coin, goldBar, state, t) {
  const floatY = Math.sin(t * 1.3) * 8;
  const goldFloatY = Math.sin(t * 1.05 + 0.7) * 6;

  coin.style.opacity = state.coinOpacity.toFixed(3);
  coin.style.transform = `translate3d(0, ${floatY}px, 0) rotateY(${state.coinRotateY.toFixed(2)}deg) scale(${state.coinScale.toFixed(3)})`;

  goldBar.style.opacity = state.goldBarOpacity.toFixed(3);
  goldBar.style.transform = `translate3d(0, ${goldFloatY}px, 0) scale(${state.goldBarScale.toFixed(3)})`;
}

function initAnimation(root) {
  const coin = root.querySelector('.simple-coin');
  const goldBar = root.querySelector('.simple-gold-bar');
  if (!coin || !goldBar) return;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    applyAnimationFrame(coin, goldBar, {
      coinOpacity: 1,
      coinRotateY: 0,
      coinScale: 1,
      goldBarOpacity: 0,
      goldBarScale: 1
    }, 0);
    return;
  }

  const start = performance.now();
  function tick(now) {
    const seconds = (now - start) / 1000;
    const elapsed = seconds % TOTAL_DURATION;
    applyAnimationFrame(coin, goldBar, animationState(elapsed), seconds);
    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}

const root = document.getElementById(ROOT_ID);
if (!root) {
  throw new Error(`[GoldSimpleHero] Missing #${ROOT_ID} mount element.`);
}

const assets = {
  coin: assetUrl(root.dataset.coinSrc, DEFAULT_COIN_IMG),
  vault: assetUrl(root.dataset.vaultSrc, DEFAULT_VAULT_IMG),
  goldBar: assetUrl(root.dataset.goldBarSrc, DEFAULT_GOLD_BAR_IMG)
};

renderGoldSimpleHero(root, assets);
initAnimation(root);
