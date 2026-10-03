/**
 * MaterialFactory.js
 * Generates and caches procedural PBR materials (wood grain, diamond plate, frame finishes, DOT tape).
 * Uses local canvas textures so the standard trailer models do not depend on remote image assets.
 */
import * as THREE from 'three';

export class MaterialFactory {
  constructor() {
    this.cache = new Map();
    this.textures = new Set();
    this.surfaceMaps = new Map();
  }

  createSurfaceMap(kind) {
    if (this.surfaceMaps.has(kind)) return this.surfaceMaps.get(kind);
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
    const context = canvas.getContext('2d'), pixels = context.createImageData(256, 256);
    let seed = 72641;
    for (let y = 0; y < 256; y++) {
      const stripe = kind === 'brushed' ? Math.sin(y * 2.1) * 18 : 0;
      for (let x = 0; x < 256; x++) {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        const value = Math.round(180 + stripe + ((seed / 4294967296) - .5) * 35);
        const offset = (y * 256 + x) * 4;
        pixels.data[offset] = pixels.data[offset + 1] = pixels.data[offset + 2] = value; pixels.data[offset + 3] = 255;
      }
    }
    context.putImageData(pixels, 0, 0);
    const texture = new THREE.CanvasTexture(canvas); texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(kind === 'brushed' ? 3 : 10, kind === 'brushed' ? 1 : 10);
    this.textures.add(texture); this.surfaceMaps.set(kind, texture); return texture;
  }

  /**
   * Generates a procedural seamless treated wood plank texture.
   */
  createWoodTextures(singleBoard = false) {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    // Base treated pine tone
    ctx.fillStyle = '#9b7147';
    ctx.fillRect(0, 0, 1024, 1024);

    // Subtle grain variation
    const plankCount = singleBoard ? 1 : 16;
    const plankHeight = 1024 / plankCount;

    for (let p = 0; p < plankCount; p++) {
      const y = p * plankHeight;
      // Slight tone shift per plank
      const toneOffset = (Math.random() - 0.5) * 18;
      ctx.fillStyle = `rgb(${155 + toneOffset}, ${113 + toneOffset * 0.8}, ${71 + toneOffset * 0.5})`;
      ctx.fillRect(0, y, 1024, plankHeight);

      // Long grain lines and knots keep individual boards from looking like flat fills.
      for (let s = 0; s < 45; s++) {
        const streakY = y + Math.random() * plankHeight;
        const alpha = 0.08 + Math.random() * 0.12;
        ctx.fillStyle = Math.random() > 0.5 ? `rgba(90, 55, 25, ${alpha})` : `rgba(190, 145, 90, ${alpha})`;
        ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = .5 + Math.random() * 1.2;
        ctx.beginPath(); ctx.moveTo(0, streakY);
        ctx.bezierCurveTo(250, streakY + 3, 760, streakY - 3, 1024, streakY); ctx.stroke();
      }
      for (let knot = 0; knot < (singleBoard ? 3 : 1); knot++) {
        const kx = 100 + Math.random() * 820, ky = y + plankHeight * (.3 + Math.random() * .4);
        ctx.strokeStyle = 'rgba(75,45,23,.25)'; ctx.lineWidth = 1;
        for (let ring = 1; ring < 5; ring++) { ctx.beginPath(); ctx.ellipse(kx, ky, ring * 8, ring * 1.8, 0, 0, Math.PI * 2); ctx.stroke(); }
      }

      // Plank gap shadow seam
      ctx.fillStyle = 'rgba(25, 15, 8, 0.9)';
      ctx.fillRect(0, y, 1024, 3);

      // Carriage bolt countersunk holes
      ctx.fillStyle = 'rgba(30, 20, 15, 0.7)';
      for (let b = 64; b < 1024; b += 192) {
        ctx.beginPath();
        ctx.arc(b, y + plankHeight / 2, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const albedoTex = new THREE.CanvasTexture(canvas);
    albedoTex.colorSpace = THREE.SRGBColorSpace;
    albedoTex.wrapS = THREE.RepeatWrapping;
    albedoTex.wrapT = THREE.RepeatWrapping;

    // Normal map for plank seams & grain
    const normCanvas = document.createElement('canvas');
    normCanvas.width = 512;
    normCanvas.height = 512;
    const nctx = normCanvas.getContext('2d');
    nctx.fillStyle = '#8080ff'; // Flat normal base
    nctx.fillRect(0, 0, 512, 512);

    const normPlankHeight = 512 / plankCount;
    for (let p = 0; p < plankCount; p++) {
      const y = p * normPlankHeight;
      // Seam indent (normal vector pointing up then down)
      nctx.fillStyle = '#6060ff';
      nctx.fillRect(0, y, 512, 2);
      nctx.fillStyle = '#a0a0ff';
      nctx.fillRect(0, y + 2, 512, 2);
    }

    const normalTex = new THREE.CanvasTexture(normCanvas);
    normalTex.wrapS = THREE.RepeatWrapping;
    normalTex.wrapT = THREE.RepeatWrapping;

    this.textures.add(albedoTex);
    this.textures.add(normalTex);

    return { albedoTex, normalTex };
  }

  /**
   * Generates a procedural diamond plate steel texture (tread pattern).
   */
  createDiamondPlateTextures() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#383b40';
    ctx.fillRect(0, 0, 512, 512);

    const normCanvas = document.createElement('canvas');
    normCanvas.width = 512;
    normCanvas.height = 512;
    const nctx = normCanvas.getContext('2d');
    nctx.fillStyle = '#8080ff';
    nctx.fillRect(0, 0, 512, 512);

    const step = 64;
    for (let y = 0; y < 512; y += step) {
      for (let x = 0; x < 512; x += step) {
        const drawLug = (cx, cy, angle) => {
          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(angle);
          // Highlight lug
          ctx.fillStyle = '#60646c';
          ctx.beginPath();
          ctx.ellipse(0, 0, 18, 5, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#232528';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.restore();

          // Normal map embossing
          nctx.save();
          nctx.translate(cx, cy);
          nctx.rotate(angle);
          nctx.fillStyle = '#9070e0';
          nctx.beginPath();
          nctx.ellipse(0, 0, 18, 5, 0, 0, Math.PI * 2);
          nctx.fill();
          nctx.restore();
        };

        drawLug(x + 16, y + 16, Math.PI / 4);
        drawLug(x + 48, y + 48, -Math.PI / 4);
      }
    }

    const albedoTex = new THREE.CanvasTexture(canvas);
    albedoTex.colorSpace = THREE.SRGBColorSpace;
    albedoTex.wrapS = THREE.RepeatWrapping;
    albedoTex.wrapT = THREE.RepeatWrapping;

    const normalTex = new THREE.CanvasTexture(normCanvas);
    normalTex.wrapS = THREE.RepeatWrapping;
    normalTex.wrapT = THREE.RepeatWrapping;

    this.textures.add(albedoTex);
    this.textures.add(normalTex);

    return { albedoTex, normalTex };
  }

  /**
   * Generates federal DOT C2 reflective red/white conspicuity tape texture.
   */
  createDOTTapeTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');

    // 11 inches red (approx 61% of cycle), 7 inches white (approx 39% of cycle)
    const redWidth = 156;
    const whiteWidth = 100;

    ctx.fillStyle = '#c5161d'; // DOT Red
    ctx.fillRect(0, 0, redWidth, 32);

    ctx.fillStyle = '#f0f0f5'; // DOT Silver-White
    ctx.fillRect(redWidth, 0, whiteWidth, 32);

    // Microprismatic honeycomb mesh lines
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 256; i += 8) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + 8, 32);
      ctx.stroke();
    }

    const tapeTex = new THREE.CanvasTexture(canvas);
    tapeTex.colorSpace = THREE.SRGBColorSpace;
    tapeTex.wrapS = THREE.RepeatWrapping;
    tapeTex.wrapT = THREE.ClampToEdgeWrapping;
    this.textures.add(tapeTex);

    return tapeTex;
  }

  /**
   * Retrieves or builds requested PBR material.
   */
  getMaterial(name, options = {}) {
    if (name === 'frame_steel') options = { ...options, sheen: options.sheen || this.finishSheen || 'satin' };
    const key = `${name}_${JSON.stringify(options)}`;
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }

    let material;
    switch (name) {
      case 'frame_steel': {
        const color = options.color || '#242426';
        const gloss = options.sheen === 'gloss', matte = options.sheen === 'matte';
        material = new THREE.MeshPhysicalMaterial({
          color: new THREE.Color(color),
          metalness: .12,
          roughness: matte ? .72 : gloss ? .26 : .46,
          clearcoat: matte ? 0 : gloss ? .85 : .25,
          clearcoatRoughness: gloss ? .16 : .35,
          bumpMap: this.createSurfaceMap('paint'), bumpScale: .00035,
          envMapIntensity: 1.0
        });
        break;
      }

      case 'deck_wood': {
        const { albedoTex, normalTex } = this.createWoodTextures(options.singleBoard);
        const repeatX = options.repeatX || 1;
        const repeatY = options.repeatY || 3;
        albedoTex.repeat.set(repeatX, repeatY);
        normalTex.repeat.set(repeatX, repeatY);

        material = new THREE.MeshStandardMaterial({
          color: new THREE.Color().setScalar(.90 + (options.tone || 0) * .025),
          map: albedoTex,
          normalMap: normalTex,
          normalScale: new THREE.Vector2(.25, .25),
          roughnessMap: this.createSurfaceMap('wood'),
          roughness: 0.85,
          metalness: 0.05
        });
        break;
      }

      case 'deck_diamond_plate': {
        const { albedoTex, normalTex } = this.createDiamondPlateTextures();
        const repeatX = options.repeatX || 4;
        const repeatY = options.repeatY || 12;
        albedoTex.repeat.set(repeatX, repeatY);
        normalTex.repeat.set(repeatX, repeatY);

        material = new THREE.MeshStandardMaterial({
          map: albedoTex,
          normalMap: normalTex,
          normalScale: new THREE.Vector2(.45, .45),
          roughnessMap: this.createSurfaceMap('brushed'),
          metalness: 0.85,
          roughness: 0.32,
          envMapIntensity: 1.2
        });
        break;
      }

      case 'tire_rubber': {
        material = new THREE.MeshStandardMaterial({
          color: new THREE.Color('#161618'),
          metalness: 0.08,
          roughness: 0.88,
          roughnessMap: this.createSurfaceMap('rubber')
        });
        break;
      }

      case 'wheel_rim': {
        material = new THREE.MeshStandardMaterial({
          color: new THREE.Color('#d4d4d8'), // Steel gray rim
          metalness: 0.82,
          roughness: 0.28,
          roughnessMap: this.createSurfaceMap('brushed'),
          envMapIntensity: 1.2
        });
        break;
      }

      case 'zinc_hardware': {
        material = new THREE.MeshStandardMaterial({
          color: new THREE.Color('#e2e8f0'), // Galvanized zinc
          metalness: 0.92,
          roughness: 0.22,
          roughnessMap: this.createSurfaceMap('brushed'),
          envMapIntensity: 1.5
        });
        break;
      }

      case 'black_iron': {
        material = new THREE.MeshStandardMaterial({
          color: new THREE.Color('#18181b'),
          metalness: 0.6,
          roughness: 0.5
        });
        break;
      }

      case 'dot_tape': {
        const tapeTex = this.createDOTTapeTexture();
        tapeTex.repeat.set(options.repeatX || 10, 1);
        material = new THREE.MeshStandardMaterial({
          map: tapeTex,
          roughness: 0.25,
          metalness: 0.1,
          emissive: new THREE.Color('#331111'),
          emissiveIntensity: 0.2
        });
        break;
      }

      case 'light_tail_red': {
        material = new THREE.MeshStandardMaterial({
          color: new THREE.Color('#b91c1c'),
          emissive: new THREE.Color('#ef4444'),
          emissiveIntensity: 0.85,
          roughness: 0.15,
          metalness: 0.2
        });
        break;
      }

      case 'light_marker_amber': {
        material = new THREE.MeshStandardMaterial({
          color: new THREE.Color('#d97706'),
          emissive: new THREE.Color('#f59e0b'),
          emissiveIntensity: 0.8,
          roughness: 0.15,
          metalness: 0.2
        });
        break;
      }

      default:
        material = new THREE.MeshStandardMaterial({ color: 0x888888 });
    }

    this.cache.set(key, material);
    return material;
  }

  dispose() {
    this.cache.forEach(mat => {
      if (mat.map) mat.map.dispose();
      if (mat.normalMap) mat.normalMap.dispose();
      mat.dispose();
    });
    this.textures.forEach(tex => tex.dispose());
    this.cache.clear();
    this.textures.clear();
    this.surfaceMaps.clear();
  }
}
