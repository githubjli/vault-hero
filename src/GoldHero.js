// ============================================================================
// BGV Hero — floating 3D gold-coin field with mouse-driven gather/scatter
//   1. Many small solid coins (CylinderGeometry + the existing PNG texture +
//      gold rim), drawn with one InstancedMesh; seeded with a minimum spacing
//      so they don't interpenetrate while floating.
//   2. Mouse choreography: each coin morphs between a SCATTERED home (depth-
//      distributed, floating) and a GATHERED target (all collapse to center,
//      aligned, scaled up -> they merge into one big coin). A per-coin delay
//      makes them stream in/out in waves ("一群飞来 / 一群飞去"); the depth
//      spread gives the far-to-near rush. The merge point follows the cursor.
//      gather amount = how close the cursor is to the cluster -> 随鼠标变换.
//   3. tsParticles gold dust drifts in the background.
//   4. Subtle camera parallax + dolly.
//
// Vault background stays the original high-res image (.hero-bg-vault).
// No new artwork — coins are textured with assets/bgv-main-icon_02.png.
// Fallback: if WebGL is unavailable the original <img#hero-coin> stays visible.
// ============================================================================

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const DEFAULT_COIN_IMG = new URL('../assets/bgv-main-icon_02.png', import.meta.url).href;
const DEFAULT_VAULT_IMG = new URL('../assets/singapore_gold_vault.png', import.meta.url).href;

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
  vault: assetUrl(root.dataset.vaultSrc, DEFAULT_VAULT_IMG)
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
let renderer, scene, camera, coins, heroCoin, faceMat, edgeMat, backMat;
let flash = 0, prevGather = 0;          // gold flash pulse at the merge moment
const clock = new THREE.Clock();
const BASE_Z = 9;
const BIG_SCALE = 2.4;          // size of the merged single coin
const MAX_DELAY = 0.45;         // gather/scatter wave spread

const dummy = new THREE.Object3D();
const billboardHelper = new THREE.Object3D();
const Z_AXIS = new THREE.Vector3(0, 0, 1);

/**
 * Asset convention:
 *
 * bgv-main-icon_02.png
 * = canonical front face
 * = G upright
 * = rotation 0
 *
 * Every merged hero coin must return
 * to this orientation.
 */
const COIN_UPRIGHT_ROTATION = 0;
const qUpright = new THREE.Quaternion().setFromAxisAngle(Z_AXIS, COIN_UPRIGHT_ROTATION);
const qSpin = new THREE.Quaternion();
const qA = new THREE.Quaternion();
const qB = new THREE.Quaternion();
const tmpAxis = new THREE.Vector3();

const data = [];
const view = { halfH: 3.3, halfW: 5.3 };
const ptr = { x: 0, y: 0, active: false };
const gather = { cur: 0, target: 0 };
const C = new THREE.Vector3();
const pointerWorld = new THREE.Vector3();
const gatherPoint = new THREE.Vector3();
const gp = new THREE.Vector3();         // eased merge point (avoids snapping)
const tmpV = new THREE.Vector3();
const camPan = { x: 0, y: 0 };
let lastMoveTime = -1e9;                 // for mouse-takeover detection
const AUTO_PERIOD = 20;                  // seconds per auto gather/scatter cycle (longer merged hold)
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

function buildCoinMesh(texture) {
  const geo = new THREE.CylinderGeometry(0.6, 0.6, 0.16, 40); // a touch thicker so the spinning edge reads
  geo.rotateX(Math.PI / 2); // caps now face ±Z, so the coin's face points along +Z (forward)
  faceMat = new THREE.MeshStandardMaterial({
    map: texture, metalness: 0.55, roughness: 0.35, alphaTest: 0.5,
    emissive: 0xffcf66, emissiveIntensity: 0
  });
  edgeMat = new THREE.MeshStandardMaterial({
    color: 0xd4af37, metalness: 0.95, roughness: 0.25,
    emissive: 0xffe08a, emissiveIntensity: 0
  });
  // Back face: horizontally-flipped texture so the G reads correctly from behind too
  const backTex = texture.clone();
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

// Update every coin's instance matrix for time t (dt advances tumbling spin).
function updateCoins(t, dt) {
  // Mouse takes over while it's recently moving; otherwise a slow auto cycle runs.
  const mouseEngaged = ptr.active && (performance.now() - lastMoveTime < 1500);

  C.set(view.halfW * 0.35, 0, 0);
  pointerWorld.set(ptr.x * view.halfW, ptr.y * view.halfH, 0);
  // merge point: follows cursor when engaged, else returns to cluster center (eased)
  const desired = mouseEngaged ? tmpV.copy(C).lerp(pointerWorld, 0.35) : tmpV.copy(C);
  gp.lerp(desired, 0.08);
  gatherPoint.copy(gp);

  if (mouseEngaged) {
    // closer cursor -> stronger gather
    gather.target = 1 - smooth01((pointerWorld.distanceTo(C) - 1.5) / 4.0);
  } else {
    // auto: scattered hold -> gather -> long merged hold (spins) -> scatter, looping
    const ph = (t % AUTO_PERIOD) / AUTO_PERIOD;
    gather.target = smooth01((ph - 0.35) / 0.15) * (1 - smooth01((ph - 0.85) / 0.10));
  }
  gather.cur += (gather.target - gather.cur) * 0.05;

  // Gold flash pulse when the swarm crosses into "merged" on the way up
  if (prevGather < 0.85 && gather.cur >= 0.85) { flash = 1; }
  prevGather = gather.cur;
  flash *= 0.94;
  const e = flash * flash;
  faceMat.emissiveIntensity = e * 0.6;
  edgeMat.emissiveIntensity = e * 1.3;
  backMat.emissiveIntensity = e * 0.6;
  const bigNow = BIG_SCALE * (1 + flash * 0.08); // brief scale pop on merge

  // Gathered instances converge only to the canonical upright orientation.
  // Scatter can tumble freely, but merged coins must not keep any random roll,
  // tilt, or arbitrary final angle.
  qB.copy(qUpright);

  for (let i = 0; i < data.length; i++) {
    const c = data[i];
    c.angle += c.spin * dt;
    const g = smooth01((gather.cur - c.delay) / (1 - MAX_DELAY));

    // scattered transform
    const sx = c.x;
    const sy = c.y + Math.sin(t * c.floatSpeed + c.floatPhase) * c.floatAmp;
    const sz = c.z;
    tmpAxis.copy(c.axis);
    qA.copy(qSpin.setFromAxisAngle(tmpAxis, c.angle)).multiply(qUpright);

    dummy.position.set(
      sx + (gatherPoint.x - sx) * g,
      sy + (gatherPoint.y - sy) * g,
      sz + (gatherPoint.z - sz) * g
    );
    dummy.quaternion.copy(qA).slerp(qB, g);
    // Instances shrink to nothing as they reach the center, so they never pile up
    // and interpenetrate — the hero coin (below) blooms in their place.
    dummy.scale.setScalar(c.scale * (1 - smooth01((g - 0.4) / 0.5)));
    dummy.updateMatrix();
    coins.setMatrixAt(i, dummy.matrix);
  }
  coins.instanceMatrix.needsUpdate = true;

  // The single hero coin grows as the swarm converges → one clean coin, no clipping
  const heroAmt = smooth01((gather.cur - 0.45) / 0.4);
  heroCoin.visible = heroAmt > 0.01;
  if (heroCoin.visible) {
    heroCoin.position.copy(gatherPoint);
    applyUprightCameraFacingOrientation(heroCoin);
    heroCoin.scale.setScalar(bigNow * heroAmt);
  }
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

    // Single merged "hero" coin (same geometry/materials) that the swarm dissolves into
    heroCoin = new THREE.Mesh(coins.geometry, [edgeMat, faceMat, backMat]);
    heroCoin.visible = false;
    scene.add(heroCoin);

    heroSection.classList.add('coins-3d');

    heroSection.addEventListener('pointermove', (e) => {
      ptr.x = (e.clientX / window.innerWidth) * 2 - 1;
      ptr.y = -((e.clientY / window.innerHeight) * 2 - 1);
      ptr.active = true;
      lastMoveTime = performance.now();
    });
    heroSection.addEventListener('pointerleave', () => { ptr.active = false; });

    window.addEventListener('resize', onFieldResize);
    clock.start();
    renderer.setAnimationLoop(animateField);
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
