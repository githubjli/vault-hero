// ============================================================================
// BGV Simple Hero — standalone coin → spin → gold flash → gold bar loop
//   1. Reuses the #gold-hero mount, asset data attributes, vault background,
//      tsParticles background, and WebGL image fallback pattern from GoldHero.
//   2. Keeps the animation intentionally simple: coin intro, one 360° coin spin,
//      required golden flash, then assets/gold-bar.png reveal and hold.
// ============================================================================

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const DEFAULT_COIN_IMG = new URL('../assets/bgv-main-icon_02.png', import.meta.url).href;
const DEFAULT_VAULT_IMG = new URL('../assets/singapore_gold_vault.png', import.meta.url).href;
const DEFAULT_GOLD_BAR_IMG = new URL('../assets/gold-bar.png', import.meta.url).href;

const ROOT_ID = 'gold-hero';
const BASE_Z = 8;
const PHASES = {
  COIN_INTRO: 'coin_intro',
  COIN_SPIN: 'coin_spin',
  GOLD_FLASH: 'gold_flash',
  GOLD_BAR: 'gold_bar'
};
const PHASE_DURATIONS = {
  [PHASES.COIN_INTRO]: 1.0,
  [PHASES.COIN_SPIN]: 3.0,
  [PHASES.GOLD_FLASH]: 1.0,
  [PHASES.GOLD_BAR]: 4.0
};
const NEXT_PHASE = {
  [PHASES.COIN_INTRO]: PHASES.COIN_SPIN,
  [PHASES.COIN_SPIN]: PHASES.GOLD_FLASH,
  [PHASES.GOLD_FLASH]: PHASES.GOLD_BAR,
  [PHASES.GOLD_BAR]: PHASES.COIN_INTRO
};

function loadScriptOnce(src) {
  if ([...document.scripts].some((script) => script.src === src)) return Promise.resolve();

  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      console.warn(`[GoldSimpleHero] optional dependency failed to load: ${src}`);
      resolve();
    };
    document.head.appendChild(script);
  });
}

function assetUrl(value, fallback) {
  return value ? new URL(value, document.baseURI).href : fallback;
}

function cssUrl(value) {
  return `url("${value.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}")`;
}

function smooth01(x) {
  x = Math.min(1, Math.max(0, x));
  return x * x * (3 - 2 * x);
}

function renderGoldSimpleHero(root, assets) {
  root.style.setProperty('--gold-hero-vault-image', cssUrl(assets.vault));
  root.innerHTML = `
    <section class="hero-section" id="hero">
      <div class="hero-bg-vault"></div>
      <canvas class="simple-hero-stage" id="simple-hero-stage" aria-hidden="true"></canvas>
      <div class="hero-particles" id="hero-particles"></div>
      <div class="container">
        <div class="hero-content">
          <div class="badge-singapore">
            <span class="flag-sg"></span>
            <span>Based in Singapore</span>
          </div>

          <h1 class="hero-title">
            The Gold-Backed<br>
            <span class="gold-text">Stablecoin</span> You Trust
          </h1>

          <p class="hero-subtitle">
            Blockchain Gold Vault (BGV) integrates the timeless, secure value of physical gold with the efficiency and
            transparency of blockchain. 1 GOLD-BGV is backed by exactly 1 gram of physical gold.
          </p>

          <div class="conversion-statement">
            <p>"The gold you buy is legally owned by you, not a promise or IOU. You have full rights to your physical gold."</p>
            <span>- BGV Custodial Legal Title</span>
          </div>

          <div class="hero-tagline gold-text">
            Real Gold. Real Ownership. Real Security.
          </div>

          <div class="hero-actions">
            <a href="#wallet" class="btn btn-primary">
              <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              Get BGV Wallet
            </a>
            <a href="#calculator" class="btn btn-secondary">
              <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              Calculate Value
            </a>
          </div>
        </div>

        <div class="coin-container" id="coin-container">
          <div class="coin-glow-effect"></div>
          <img src="${assets.coin}" alt="BGV Gold Stablecoin" class="hero-coin" id="hero-coin">
        </div>
      </div>
    </section>
  `;
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

const heroSection = document.getElementById('hero');
const coinContainer = document.getElementById('coin-container');
const stageCanvas = document.getElementById('simple-hero-stage');
const fallbackImg = document.getElementById('hero-coin');
const ptr = { x: 0, y: 0, active: false };
const camPan = { x: 0, y: 0 };
const view = { halfH: 3, halfW: 5 };
const heroPoint = new THREE.Vector3();

let renderer, scene, camera, coinMesh, goldBarMesh, flashSprite, flashMat, goldBarMat;
let phase = PHASES.COIN_INTRO;
let phaseStart = 0;

function webglAvailable() {
  try {
    const canvas = document.createElement('canvas');
    return !!(window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
  } catch (e) { return false; }
}

function updateView(aspect) {
  view.halfH = Math.tan((40 * Math.PI / 180) / 2) * BASE_Z;
  view.halfW = view.halfH * aspect;
}

function updateHeroPoint() {
  heroPoint.set(window.innerWidth > 991 ? view.halfW * 0.35 : 0, 0, 0);
}

function fieldSize() {
  const height = window.innerHeight || 700;
  let width = window.innerWidth;
  if (!width || width <= 1) width = Math.round(heroSection.getBoundingClientRect().width);
  if (!width || width <= 1) width = Math.round(height * 1.6);
  return { width, height };
}

function initParticles() {
  if (!window.tsParticles) return;
  tsParticles.load({
    id: 'hero-particles',
    options: {
      fullScreen: { enable: false },
      fpsLimit: 60,
      particles: {
        number: { value: 45, density: { enable: true, area: 900 } },
        color: { value: ['#d4af37', '#f3e5ab', '#aa7c11'] },
        shape: { type: 'circle' },
        opacity: { value: { min: 0.1, max: 0.55 }, animation: { enable: true, speed: 0.6, sync: false } },
        size: { value: { min: 1, max: 3 } },
        move: {
          enable: true, direction: 'top', speed: { min: 0.3, max: 1 },
          random: true, straight: false, outModes: { default: 'out' }
        }
      },
      detectRetina: true
    }
  }).catch((e) => console.warn('[GoldSimpleHero] tsParticles failed:', e));
}

function makeFlashTexture() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(255, 255, 238, 1)');
  gradient.addColorStop(0.2, 'rgba(255, 226, 112, 0.95)');
  gradient.addColorStop(0.48, 'rgba(212, 175, 55, 0.55)');
  gradient.addColorStop(1, 'rgba(212, 175, 55, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makePlane(texture, height, materialOptions = {}) {
  texture.colorSpace = THREE.SRGBColorSpace;
  const aspect = texture.image?.width && texture.image?.height ? texture.image.width / texture.image.height : 1;
  const geometry = new THREE.PlaneGeometry(height * aspect, height);
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    ...materialOptions
  });
  return new THREE.Mesh(geometry, material);
}

function buildFlashSprite() {
  flashMat = new THREE.SpriteMaterial({
    map: makeFlashTexture(),
    color: 0xffd86b,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  const sprite = new THREE.Sprite(flashMat);
  sprite.visible = false;
  return sprite;
}

function setPhase(nextPhase, t) {
  phase = nextPhase;
  phaseStart = t;
}

function phaseProgress(t) {
  return Math.min(1, (t - phaseStart) / PHASE_DURATIONS[phase]);
}

function advancePhaseIfNeeded(t) {
  while (t - phaseStart >= PHASE_DURATIONS[phase]) {
    const overflow = t - phaseStart - PHASE_DURATIONS[phase];
    phase = NEXT_PHASE[phase];
    phaseStart = t - overflow;
  }
}

function updateAnimation(t) {
  advancePhaseIfNeeded(t);

  const p = phaseProgress(t);
  const eased = smooth01(p);
  updateHeroPoint();

  coinMesh.visible = false;
  goldBarMesh.visible = false;
  flashSprite.visible = false;
  flashMat.opacity = 0;
  goldBarMat.opacity = 0;
  coinMesh.material.opacity = 1;

  if (phase === PHASES.COIN_INTRO) {
    coinMesh.visible = true;
    coinMesh.position.copy(heroPoint);
    coinMesh.rotation.set(0, 0, 0);
    coinMesh.scale.setScalar(0.2 + 0.8 * eased);
    return;
  }

  if (phase === PHASES.COIN_SPIN) {
    coinMesh.visible = true;
    coinMesh.position.copy(heroPoint);
    coinMesh.rotation.set(0, Math.PI * 2 * eased, 0);
    coinMesh.scale.setScalar(1);
    return;
  }

  if (phase === PHASES.GOLD_FLASH) {
    const coinOut = 1 - smooth01(p / 0.35);
    const flashIn = smooth01(Math.min(1, p / 0.25));
    const flashOut = 1 - smooth01(Math.max(0, p - 0.35) / 0.65);
    coinMesh.visible = coinOut > 0.01;
    if (coinMesh.visible) {
      coinMesh.position.copy(heroPoint);
      coinMesh.rotation.set(0, 0, 0);
      coinMesh.scale.setScalar(coinOut);
      coinMesh.material.opacity = coinOut;
    }
    flashSprite.visible = true;
    flashSprite.position.copy(heroPoint);
    flashSprite.position.z += 0.05;
    flashSprite.scale.setScalar(0.6 + 4.2 * eased);
    flashMat.opacity = flashIn * flashOut;
    return;
  }

  const reveal = Math.min(1, p / 0.22);
  const settle = 1 + Math.sin(reveal * Math.PI) * 0.1;
  goldBarMesh.visible = true;
  goldBarMesh.position.set(heroPoint.x, heroPoint.y + Math.sin(t * 1.15) * 0.07, heroPoint.z);
  goldBarMesh.rotation.set(0.06 * Math.sin(t * 0.7), 0.12 * Math.sin(t * 0.45), 0.02 * Math.sin(t * 0.6));
  goldBarMesh.scale.setScalar((0.2 + 0.8 * smooth01(reveal)) * settle);
  goldBarMat.opacity = smooth01(reveal);
}

function initSimpleField() {
  const textureLoader = new THREE.TextureLoader();
  textureLoader.load(assets.coin, (coinTexture) => {
    textureLoader.load(assets.goldBar, (goldBarTexture) => {
      const { width, height } = fieldSize();
      const aspect = width / height;

      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(40, aspect, 0.1, 100);
      updateView(aspect);
      updateHeroPoint();

      camera.position.set(0, 0, BASE_Z);
      camera.lookAt(0, 0, 0);

      renderer = new THREE.WebGLRenderer({ canvas: stageCanvas, antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(width, height);
      coinTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
      goldBarTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();

      coinMesh = makePlane(coinTexture, 3.2);
      goldBarMesh = makePlane(goldBarTexture, 2.0, { opacity: 0 });
      goldBarMat = goldBarMesh.material;
      flashSprite = buildFlashSprite();

      goldBarMesh.visible = false;
      scene.add(coinMesh, flashSprite, goldBarMesh);
      heroSection.classList.add('simple-3d');

      heroSection.addEventListener('pointermove', (e) => {
        ptr.x = (e.clientX / window.innerWidth) * 2 - 1;
        ptr.y = -((e.clientY / window.innerHeight) * 2 - 1);
        ptr.active = true;
      });
      heroSection.addEventListener('pointerleave', () => { ptr.active = false; });
      window.addEventListener('resize', onFieldResize);

      setPhase(PHASES.COIN_INTRO, 0);
      renderer.setAnimationLoop(animateField);
    }, undefined, (err) => {
      console.warn('[GoldSimpleHero] gold bar texture failed, using image fallback:', err);
      initFallbackTilt();
    });
  }, undefined, (err) => {
    console.warn('[GoldSimpleHero] coin texture failed, using image fallback:', err);
    initFallbackTilt();
  });
}

function animateField(timeMs) {
  const t = timeMs * 0.001;
  updateAnimation(t);

  camPan.x += (ptr.x * 0.45 - camPan.x) * 0.05;
  camPan.y += (ptr.y * 0.3 - camPan.y) * 0.05;
  camera.position.x = camPan.x;
  camera.position.y = camPan.y;
  camera.position.z = BASE_Z + Math.sin(t * 0.25) * 0.35;
  camera.lookAt(0, 0, 0);

  renderer.render(scene, camera);
}

function onFieldResize() {
  if (!renderer) return;
  const { width, height } = fieldSize();
  camera.aspect = width / height;
  updateView(camera.aspect);
  updateHeroPoint();
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

function initFallbackTilt() {
  if (!fallbackImg) return;
  heroSection.classList.remove('simple-3d');
  if (window.gsap) {
    gsap.to(fallbackImg, { y: -16, duration: 2.4, ease: 'sine.inOut', yoyo: true, repeat: -1 });
  }
  let ticking = false;
  coinContainer.addEventListener('mousemove', (e) => {
    const rect = coinContainer.getBoundingClientRect();
    const mx = e.clientX - rect.left - rect.width / 2;
    const my = e.clientY - rect.top - rect.height / 2;
    if (!ticking) {
      requestAnimationFrame(() => {
        const rx = -(my / (rect.height / 2)) * 18;
        const ry = (mx / (rect.width / 2)) * 18;
        fallbackImg.style.transform = `perspective(1000px) rotateX(${rx}deg) rotateY(${ry}deg) scale(1.05)`;
        ticking = false;
      });
      ticking = true;
    }
  });
  coinContainer.addEventListener('mouseleave', () => {
    fallbackImg.style.transition = 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)';
    fallbackImg.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale(1)';
  });
}

await loadScriptOnce('https://cdn.jsdelivr.net/npm/@tsparticles/slim@3.5.0/tsparticles.slim.bundle.min.js');
initParticles();

if (webglAvailable()) {
  try { initSimpleField(); }
  catch (e) { console.warn('[GoldSimpleHero] simple field init failed, using image fallback:', e); initFallbackTilt(); }
} else {
  await loadScriptOnce('https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js');
  initFallbackTilt();
}
