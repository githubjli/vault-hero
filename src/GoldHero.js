// ============================================================================
// BGV Hero — phased 3D gold animation flow
//   1. Starts with one large BGV coin, then rotates it one complete 360° turn.
//   2. The large coin explodes into an InstancedMesh cloud of small coins that
//      keep their existing seeded float, spin, depth, and low-power behavior.
//   3. The cloud gathers back to center, forges through a required gold flash,
//      then reveals assets/gold-bar.png before looping to the coin again.
//   4. tsParticles gold dust drifts in the background.
//   5. Pointer movement is kept for subtle camera parallax only.
//
// Vault background stays the original high-res image (.hero-bg-vault).
// Coin textures use assets/bgv-main-icon_02.png. Gold bar uses assets/gold-bar.png.
// Fallback: if WebGL is unavailable the original <img#hero-coin> stays visible.
// ============================================================================

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const DEFAULT_COIN_IMG = new URL('../assets/bgv-main-icon_02.png', import.meta.url).href;
const DEFAULT_VAULT_IMG = new URL('../assets/singapore_gold_vault.png', import.meta.url).href;
const DEFAULT_GOLD_BAR_IMG = new URL('../assets/gold-bar.png', import.meta.url).href;

/**
 * Coin texture orientation calibration.
 *
 * bgv-main-icon_02.png is the canonical front face.
 * The G should be upright when COIN_UPRIGHT_ROTATION is applied.
 *
 * Asset convention:
 * bgv-main-icon_02.png
 * = canonical front face
 * = G upright
 * = rotation 0
 *
 * Change only this value when replacing the coin artwork.
 */
const COIN_UPRIGHT_ROTATION = Math.PI / 4;
const DEBUG_UPRIGHT = false;

const ROOT_ID = 'gold-hero';

function loadScriptOnce(src) {
  if ([...document.scripts].some((script) => script.src === src)) return Promise.resolve();

  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      console.warn(`[GoldHero] optional dependency failed to load: ${src}`);
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

function renderGoldHero(root, assets) {
  root.style.setProperty('--gold-hero-vault-image', cssUrl(assets.vault));
  root.innerHTML = `
    <section class="hero-section" id="hero">
      <div class="hero-bg-vault"></div>
      <canvas class="coin-field" id="coin-field" aria-hidden="true"></canvas>
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
  throw new Error(`[GoldHero] Missing #${ROOT_ID} mount element.`);
}

const assets = {
  coin: assetUrl(root.dataset.coinSrc, DEFAULT_COIN_IMG),
  vault: assetUrl(root.dataset.vaultSrc, DEFAULT_VAULT_IMG),
  goldBar: assetUrl(root.dataset.goldBarSrc, DEFAULT_GOLD_BAR_IMG)
};

renderGoldHero(root, assets);


const heroSection = document.getElementById('hero');
const coinContainer = document.getElementById('coin-container');
const fieldCanvas = document.getElementById('coin-field');
const fallbackImg = document.getElementById('hero-coin');

const LOW_POWER = window.innerWidth < 768 || (navigator.hardwareConcurrency || 8) <= 4;
const COIN_COUNT = LOW_POWER ? 32 : 64;

const rand = (a, b) => a + Math.random() * (b - a);

function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext &&
      (c.getContext('webgl') || c.getContext('experimental-webgl')));
  } catch (e) { return false; }
}

// ---------------------------------------------------------------------------
// tsParticles gold background
// ---------------------------------------------------------------------------
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
  }).catch((e) => console.warn('[GoldHero] tsParticles failed:', e));
}

// ---------------------------------------------------------------------------
// Floating / gathering 3D coin field
// ---------------------------------------------------------------------------
let renderer, scene, camera, coins, heroCoin, goldBar, flashSprite, faceMat, edgeMat, backMat;
let flashMat, goldBarMat;
const clock = new THREE.Clock();
const BASE_Z = 9;
const BIG_SCALE = 2.4;          // size of the large single coin
const GOLD_BAR_BASE_SCALE = 2.7;
const MAX_DELAY = 0.45;         // gather/scatter wave spread

const PHASES = {
  INTRO_COIN: 'intro_coin',
  COIN_SPIN: 'coin_spin',
  COIN_EXPLODE: 'coin_explode',
  COIN_FIELD: 'coin_field',
  COIN_GATHER: 'coin_gather',
  GOLD_FLASH: 'gold_flash',
  GOLD_BAR: 'gold_bar'
};

const PHASE_DURATIONS = {
  INTRO_COIN: 1.0,
  COIN_SPIN: 3.0,
  COIN_EXPLODE: 1.4,
  COIN_FIELD: 4.0,
  COIN_GATHER: 2.0,
  GOLD_FLASH: 1.0,
  GOLD_BAR: 4.0
};

const PHASE_DURATION_BY_NAME = {
  [PHASES.INTRO_COIN]: PHASE_DURATIONS.INTRO_COIN,
  [PHASES.COIN_SPIN]: PHASE_DURATIONS.COIN_SPIN,
  [PHASES.COIN_EXPLODE]: PHASE_DURATIONS.COIN_EXPLODE,
  [PHASES.COIN_FIELD]: PHASE_DURATIONS.COIN_FIELD,
  [PHASES.COIN_GATHER]: PHASE_DURATIONS.COIN_GATHER,
  [PHASES.GOLD_FLASH]: PHASE_DURATIONS.GOLD_FLASH,
  [PHASES.GOLD_BAR]: PHASE_DURATIONS.GOLD_BAR
};

const NEXT_PHASE = {
  [PHASES.INTRO_COIN]: PHASES.COIN_SPIN,
  [PHASES.COIN_SPIN]: PHASES.COIN_EXPLODE,
  [PHASES.COIN_EXPLODE]: PHASES.COIN_FIELD,
  [PHASES.COIN_FIELD]: PHASES.COIN_GATHER,
  [PHASES.COIN_GATHER]: PHASES.GOLD_FLASH,
  [PHASES.GOLD_FLASH]: PHASES.GOLD_BAR,
  [PHASES.GOLD_BAR]: PHASES.INTRO_COIN
};

let phase = PHASES.INTRO_COIN;
let phaseStart = 0;

const dummy = new THREE.Object3D();
const billboardHelper = new THREE.Object3D();
const Z_AXIS = new THREE.Vector3(0, 0, 1);
const Y_AXIS = new THREE.Vector3(0, 1, 0);
// The geometry is pre-rotated so the front cap normal points toward +Z,
// which faces the default camera at +Z. No logo roll is encoded here.
const qFace = new THREE.Quaternion();
// The only logo-roll correction: rotate around the coin face normal.
const qLogoFix = new THREE.Quaternion().setFromAxisAngle(Z_AXIS, COIN_UPRIGHT_ROTATION);
// Canonical final coin orientation: face camera + calibrated upright logo.
const qUpright = new THREE.Quaternion().copy(qFace).multiply(qLogoFix);
const qSpin = new THREE.Quaternion();
const qA = new THREE.Quaternion();
const qB = new THREE.Quaternion();
const tmpAxis = new THREE.Vector3();
const ySpinQuat = new THREE.Quaternion();

const data = [];
const view = { halfH: 3.3, halfW: 5.3 };
const ptr = { x: 0, y: 0, active: false };
const C = new THREE.Vector3();
const pointerWorld = new THREE.Vector3();
const gatherPoint = new THREE.Vector3();
const gp = new THREE.Vector3();         // eased merge point (avoids snapping)
const tmpV = new THREE.Vector3();
const camPan = { x: 0, y: 0 };
const Z_MIN = -5.0, Z_MAX = 3.5;         // coin depth range (drives 近大远小 + parallax)

function fieldSize() {
  // The canvas is full-bleed width / 100vh. Prefer the viewport; fall back through the
  // hero box and finally a landscape assumption so a 0-width read never collapses the field.
  const height = window.innerHeight || 700;
  let width = window.innerWidth;
  if (!width || width <= 1) width = Math.round(heroSection.getBoundingClientRect().width);
  if (!width || width <= 1) width = Math.round(height * 1.6);
  return { width, height };
}

function calibrateCoinTexture(texture) {
  texture.center.set(0.5, 0.5);
  texture.rotation = COIN_UPRIGHT_ROTATION;
  texture.needsUpdate = true;
  return texture;
}

function buildCoinMesh(texture) {
  const geo = new THREE.CylinderGeometry(0.6, 0.6, 0.16, 40); // a touch thicker so the spinning edge reads
  geo.rotateX(THREE.MathUtils.degToRad(90)); // caps now face ±Z, so the coin's face points along +Z (forward)
  calibrateCoinTexture(texture);
  faceMat = new THREE.MeshStandardMaterial({
    map: texture, metalness: 0.55, roughness: 0.35, alphaTest: 0.5,
    emissive: 0xffcf66, emissiveIntensity: 0
  });
  edgeMat = new THREE.MeshStandardMaterial({
    color: 0xd4af37, metalness: 0.95, roughness: 0.25,
    emissive: 0xffe08a, emissiveIntensity: 0
  });
  // Back face: horizontally-flipped texture so the G reads correctly from behind too
  const backTex = calibrateCoinTexture(texture.clone());
  backTex.colorSpace = THREE.SRGBColorSpace;
  backTex.wrapS = THREE.RepeatWrapping;
  backTex.repeat.x = -1;
  backTex.needsUpdate = true;
  backMat = new THREE.MeshStandardMaterial({
    map: backTex, metalness: 0.55, roughness: 0.35, alphaTest: 0.5,
    emissive: 0xffcf66, emissiveIntensity: 0
  });
  return new THREE.InstancedMesh(geo, [edgeMat, faceMat, backMat], COIN_COUNT); // [side, top, bottom]
}

function makeFlashTexture() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(255, 255, 235, 1)');
  gradient.addColorStop(0.22, 'rgba(255, 229, 118, 0.95)');
  gradient.addColorStop(0.48, 'rgba(212, 175, 55, 0.55)');
  gradient.addColorStop(1, 'rgba(212, 175, 55, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
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

function buildGoldBar(texture) {
  texture.colorSpace = THREE.SRGBColorSpace;
  const imageAspect = texture.image?.width && texture.image?.height ? texture.image.width / texture.image.height : 1.8;
  const geometry = new THREE.PlaneGeometry(imageAspect, 1);
  goldBarMat = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity: 0,
    depthWrite: false
  });
  const mesh = new THREE.Mesh(geometry, goldBarMat);
  mesh.visible = false;
  return mesh;
}

function seedCoins(aspect) {
  view.halfH = Math.tan((40 * Math.PI / 180) / 2) * BASE_Z;
  view.halfW = view.halfH * aspect;
  data.length = 0;
  const minDist = 1.0;
  let attempts = 0;
  while (data.length < COIN_COUNT && attempts < COIN_COUNT * 60) {
    attempts++;
    const x = rand(-0.25, 1.05) * view.halfW;   // weighted right so headline stays clear
    const y = rand(-1, 1) * view.halfH;
    const z = rand(Z_MIN, Z_MAX);               // depth -> far-to-near rush + parallax
    let ok = true;
    for (const o of data) {
      const dx = o.x - x, dy = o.y - y, dz = (o.z - z) * 0.5;
      if (dx * dx + dy * dy + dz * dz < minDist * minDist) { ok = false; break; }
    }
    if (!ok) continue;
    data.push(makeCoin(x, y, z));
  }
  while (data.length < COIN_COUNT) {           // fill remainder if spacing was tight
    data.push(makeCoin(rand(-0.25, 1.05) * view.halfW, rand(-1, 1) * view.halfH, rand(Z_MIN, Z_MAX)));
  }
  gp.set(view.halfW * 0.35, 0, 0);             // start the merge point at the cluster center
}

function makeCoin(x, y, z) {
  // Tie size strongly to depth: far coins are tiny (cheap + deep), near coins large.
  const depth01 = (z - Z_MIN) / (Z_MAX - Z_MIN);
  return {
    x, y, z,
    scale: (0.12 + depth01 * 1.1) * rand(0.85, 1.15),
    axis: new THREE.Vector3(rand(-0.3, 0.3), 1, rand(-0.3, 0.3)).normalize(),
    angle: rand(0, Math.PI * 2),
    spin: rand(0.3, 0.9) * (Math.random() < 0.5 ? -1 : 1),
    floatAmp: rand(0.1, 0.3),
    floatSpeed: rand(0.4, 1.1),
    floatPhase: rand(0, Math.PI * 2),
    delay: rand(0, MAX_DELAY)
  };
}

function smooth01(x) { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); }

function setPhase(nextPhase, t) {
  phase = nextPhase;
  phaseStart = t;
  if (phase === PHASES.INTRO_COIN) {
    gp.set(view.halfW * 0.35, 0, 0);
    gatherPoint.copy(gp);
  }
}

function getPhaseTime(t) {
  return t - phaseStart;
}

function getPhaseProgress(t) {
  return Math.min(1, getPhaseTime(t) / PHASE_DURATION_BY_NAME[phase]);
}

function advancePhaseIfNeeded(t) {
  while (getPhaseTime(t) >= PHASE_DURATION_BY_NAME[phase]) {
    const overflow = getPhaseTime(t) - PHASE_DURATION_BY_NAME[phase];
    phase = NEXT_PHASE[phase];
    phaseStart = t - overflow;
    if (phase === PHASES.INTRO_COIN) {
      gp.set(view.halfW * 0.35, 0, 0);
      gatherPoint.copy(gp);
    }
  }
}

function updateCoinMaterialsEmissive(amount) {
  const e = Math.max(0, amount);
  faceMat.emissiveIntensity = e * 0.6;
  edgeMat.emissiveIntensity = e * 1.3;
  backMat.emissiveIntensity = e * 0.6;
}

function setAllCoinInstancesHidden() {
  for (let i = 0; i < data.length; i++) {
    dummy.scale.setScalar(0);
    dummy.updateMatrix();
    coins.setMatrixAt(i, dummy.matrix);
  }
  coins.instanceMatrix.needsUpdate = true;
}

// Update every coin's instance matrix for time t (dt advances tumbling spin).
function updateCoins(t, dt) {
  if (DEBUG_UPRIGHT) {
    showDebugUprightCoin();
    return;
  }

  advancePhaseIfNeeded(t);

  C.set(view.halfW * 0.35, 0, 0);
  gp.lerp(C, 0.08);
  gatherPoint.copy(gp);

  const p = getPhaseProgress(t);
  const eased = smooth01(p);
  const isCoinPhase = phase === PHASES.COIN_EXPLODE || phase === PHASES.COIN_FIELD || phase === PHASES.COIN_GATHER || phase === PHASES.GOLD_FLASH;
  coins.visible = isCoinPhase;
  heroCoin.visible = false;
  goldBar.visible = false;
  flashSprite.visible = false;
  updateCoinMaterialsEmissive(0);

  qB.copy(qUpright);

  if (phase === PHASES.INTRO_COIN) {
    setAllCoinInstancesHidden();
    heroCoin.visible = true;
    heroCoin.position.copy(gatherPoint);
    applyUprightCameraFacingOrientation(heroCoin);
    heroCoin.scale.setScalar(BIG_SCALE * eased);
    return;
  }

  if (phase === PHASES.COIN_SPIN) {
    setAllCoinInstancesHidden();
    heroCoin.visible = true;
    heroCoin.position.copy(gatherPoint);
    applyUprightCameraFacingOrientation(heroCoin);
    ySpinQuat.setFromAxisAngle(Y_AXIS, Math.PI * 2 * eased);
    heroCoin.quaternion.multiply(ySpinQuat);
    heroCoin.scale.setScalar(BIG_SCALE);
    return;
  }

  if (phase === PHASES.GOLD_BAR) {
    setAllCoinInstancesHidden();
    const intro = Math.min(1, p / 0.22);
    const settle = 1 + Math.sin(intro * Math.PI) * 0.12;
    const floatY = Math.sin(t * 1.2) * 0.08;
    goldBar.visible = true;
    goldBar.position.set(gatherPoint.x, gatherPoint.y + floatY, gatherPoint.z);
    goldBar.rotation.set(0.08 * Math.sin(t * 0.7), 0.12 * Math.sin(t * 0.45), 0.03 * Math.sin(t * 0.6));
    goldBar.scale.setScalar(GOLD_BAR_BASE_SCALE * (0.2 + 0.8 * smooth01(intro)) * settle);
    if (goldBarMat) goldBarMat.opacity = smooth01(intro);
    return;
  }

  if (phase === PHASES.GOLD_FLASH) {
    const flashOpacity = 1 - smooth01(Math.max(0, p - 0.15) / 0.85);
    const flashScale = 0.5 + 3.5 * smooth01(p);
    updateCoinMaterialsEmissive((1 - p) * 1.4);
    flashSprite.visible = true;
    flashSprite.position.copy(gatherPoint);
    flashSprite.scale.setScalar(flashScale);
    flashMat.opacity = flashOpacity;
  }

  for (let i = 0; i < data.length; i++) {
    const c = data[i];
    c.angle += c.spin * dt;

    const sx = c.x;
    const sy = c.y + Math.sin(t * c.floatSpeed + c.floatPhase) * c.floatAmp;
    const sz = c.z;
    tmpAxis.copy(c.axis);
    qA.copy(qSpin.setFromAxisAngle(tmpAxis, c.angle)).multiply(qUpright);

    let outward = 1;
    let gathered = 0;
    let scaleMultiplier = 1;

    if (phase === PHASES.COIN_EXPLODE) {
      outward = smooth01((p - c.delay) / (1 - MAX_DELAY));
      scaleMultiplier = outward * (1 - 0.25 * (1 - eased));
      heroCoin.visible = p < 0.72;
    } else if (phase === PHASES.COIN_FIELD) {
      outward = 1;
      scaleMultiplier = 1;
    } else if (phase === PHASES.COIN_GATHER) {
      gathered = smooth01((p - c.delay) / (1 - MAX_DELAY));
      outward = 1 - gathered;
      scaleMultiplier = 1 - smooth01((gathered - 0.4) / 0.5);
    } else if (phase === PHASES.GOLD_FLASH) {
      gathered = 1;
      outward = 0;
      scaleMultiplier = 0;
    }

    dummy.position.set(
      gatherPoint.x + (sx - gatherPoint.x) * outward,
      gatherPoint.y + (sy - gatherPoint.y) * outward,
      gatherPoint.z + (sz - gatherPoint.z) * outward
    );
    dummy.quaternion.copy(qA).slerp(qB, gathered);
    dummy.scale.setScalar(c.scale * scaleMultiplier);
    dummy.updateMatrix();
    coins.setMatrixAt(i, dummy.matrix);
  }
  coins.instanceMatrix.needsUpdate = true;

  if (phase === PHASES.COIN_EXPLODE && heroCoin.visible) {
    const shrink = 1 - smooth01(p / 0.72);
    heroCoin.position.copy(gatherPoint);
    applyUprightCameraFacingOrientation(heroCoin);
    heroCoin.scale.setScalar(BIG_SCALE * shrink);
  }

  if (phase === PHASES.COIN_GATHER && p > 0.62) {
    const heroAmt = smooth01((p - 0.62) / 0.28) * (1 - smooth01((p - 0.92) / 0.08));
    heroCoin.visible = heroAmt > 0.01;
    if (heroCoin.visible) {
      heroCoin.position.copy(gatherPoint);
      applyUprightCameraFacingOrientation(heroCoin);
      heroCoin.scale.setScalar(BIG_SCALE * heroAmt);
    }
  }
}

function showDebugUprightCoin() {
  if (coins) coins.visible = false;
  if (!heroCoin) return;
  heroCoin.visible = true;
  heroCoin.position.set(0, 0, 0);
  heroCoin.quaternion.copy(qUpright);
  heroCoin.scale.setScalar(3);
}

function applyUprightCameraFacingOrientation(mesh) {
  // Face the camera first, then apply the single canonical upright correction.
  // This keeps the merged G readable without adding any ad hoc Z-roll or
  // arbitrary final angle outside qUpright.
  billboardHelper.position.copy(mesh.position);
  billboardHelper.up.set(0, 1, 0);
  billboardHelper.lookAt(camera.position);
  mesh.quaternion.copy(billboardHelper.quaternion).multiply(qUpright);
}

function initCoinField() {
  new THREE.TextureLoader().load(assets.coin, (texture) => {
    texture.colorSpace = THREE.SRGBColorSpace;
    const { width, height } = fieldSize();
    const aspect = width / height;

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(40, aspect, 0.1, 100);
    camera.position.set(0, 0, BASE_Z);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ canvas: fieldCanvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();

    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    scene.add(new THREE.HemisphereLight(0xfff2cc, 0x1a1206, 0.5));
    const key = new THREE.DirectionalLight(0xfff2cc, 2.0); key.position.set(3, 4, 5); scene.add(key);
    const rim = new THREE.PointLight(0xffd86b, 1.3, 60); rim.position.set(-5, -2, 4); scene.add(rim);

    coins = buildCoinMesh(texture);
    seedCoins(aspect);
    scene.add(coins);

    // Single large hero coin (same geometry/materials) used for intro, spin, and explode.
    heroCoin = new THREE.Mesh(coins.geometry, [edgeMat, faceMat, backMat]);
    heroCoin.visible = false;
    scene.add(heroCoin);

    flashSprite = buildFlashSprite();
    scene.add(flashSprite);

    new THREE.TextureLoader().load(assets.goldBar, (goldBarTexture) => {
      goldBar = buildGoldBar(goldBarTexture);
      scene.add(goldBar);

      heroSection.classList.add('coins-3d');

      heroSection.addEventListener('pointermove', (e) => {
        ptr.x = (e.clientX / window.innerWidth) * 2 - 1;
        ptr.y = -((e.clientY / window.innerHeight) * 2 - 1);
        ptr.active = true;
      });
      heroSection.addEventListener('pointerleave', () => { ptr.active = false; });

      setPhase(PHASES.INTRO_COIN, 0);
      window.addEventListener('resize', onFieldResize);
      clock.start();
      renderer.setAnimationLoop(animateField);
    }, undefined, (err) => {
      console.warn('[GoldHero] gold bar texture failed, using image fallback:', err);
      initFallbackTilt();
    });
  }, undefined, (err) => {
    console.warn('[GoldHero] coin texture failed, using image fallback:', err);
    initFallbackTilt();
  });
}

function animateField() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  updateCoins(t, dt);

  camPan.x += (ptr.x * 0.6 - camPan.x) * 0.05;
  camPan.y += (ptr.y * 0.4 - camPan.y) * 0.05;
  camera.position.x = camPan.x;
  camera.position.y = camPan.y;
  camera.position.z = BASE_Z + Math.sin(t * 0.25) * 0.6;
  camera.lookAt(0, 0, 0);

  renderer.render(scene, camera);
}

function onFieldResize() {
  if (!renderer) return;
  const { width, height } = fieldSize();
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
  seedCoins(width / height);
}

// ---------------------------------------------------------------------------
// Fallback: original <img> coin with tilt + float (no WebGL)
// ---------------------------------------------------------------------------
function initFallbackTilt() {
  if (!fallbackImg) return;
  heroSection.classList.remove('coins-3d');
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

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
await loadScriptOnce('https://cdn.jsdelivr.net/npm/@tsparticles/slim@3.5.0/tsparticles.slim.bundle.min.js');
initParticles();

if (webglAvailable()) {
  try { initCoinField(); }
  catch (e) { console.warn('[GoldHero] coin field init failed, using image fallback:', e); initFallbackTilt(); }
} else {
  await loadScriptOnce('https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js');
  initFallbackTilt();
}
