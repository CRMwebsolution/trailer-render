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

      // Fine grain streaks
      for (let s = 0; s < 45; s++) {
        const streakY = y + Math.random() * plankHeight;
        const alpha = 0.08 + Math.random() * 0.12;
        ctx.fillStyle = Math.random() > 0.5 ? `rgba(90, 55, 25, ${alpha})` : `rgba(190, 145, 90, ${alpha})`;
        ctx.fillRect(0, streakY, 1024, 1.2 + Math.random() * 1.5);
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
    const key = `${name}_${JSON.stringify(options)}`;
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }

    let material;
    switch (name) {
      case 'frame_steel': {
        const color = options.color || '#242426';
        material = new THREE.MeshStandardMaterial({
          color: new THREE.Color(color),
          metalness: 0.45,
          roughness: 0.38,
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
          normalScale: new THREE.Vector2(0.85, 0.85),
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
          normalScale: new THREE.Vector2(1.2, 1.2),
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
          roughnessMap: null
        });
        break;
      }

      case 'wheel_rim': {
        material = new THREE.MeshStandardMaterial({
          color: new THREE.Color('#d4d4d8'), // Steel gray rim
          metalness: 0.82,
          roughness: 0.28,
          envMapIntensity: 1.2
        });
        break;
      }

      case 'zinc_hardware': {
        material = new THREE.MeshStandardMaterial({
          color: new THREE.Color('#e2e8f0'), // Galvanized zinc
          metalness: 0.92,
          roughness: 0.22,
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
  }
}
