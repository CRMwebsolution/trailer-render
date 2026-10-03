/**
 * DecalFactory.js
 * Generates procedural canvas textures for trailer frame badges, company signage,
 * and full-side cargo trailer graphics.
 */
import * as THREE from 'three';

export class DecalFactory {
  constructor() {
    this.cache = new Map();
  }

  /**
   * Generates a canvas texture with crisp vector-rendered signage typography.
   * @param {string} text 
   * @param {string} color 
   * @param {boolean} fullSide 
   * @returns {THREE.CanvasTexture}
   */
  createDecalTexture(text = 'TITAN 14K', color = '#f59e0b', fullSide = false) {
    const key = `${text}_${color}_${fullSide}`;
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }

    const canvas = document.createElement('canvas');
    canvas.width = fullSide ? 2048 : 1024;
    canvas.height = fullSide ? 512 : 128;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (text && text.trim().length > 0) {
      if (fullSide) {
        // Full-Side Cargo Trailer Corporate / Racing Decal Graphic
        // Accent background banner
        ctx.fillStyle = 'rgba(18, 20, 26, 0.65)';
        ctx.beginPath();
        ctx.moveTo(80, 60);
        ctx.lineTo(canvas.width - 80, 60);
        ctx.lineTo(canvas.width - 160, canvas.height - 60);
        ctx.lineTo(160, canvas.height - 60);
        ctx.closePath();
        ctx.fill();

        // Speed stripe
        ctx.fillStyle = color;
        ctx.fillRect(160, canvas.height - 75, canvas.width - 320, 10);

        // Main Text
        ctx.font = '900 130px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = color;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 12;
        ctx.shadowOffsetX = 4;
        ctx.shadowOffsetY = 4;
        ctx.fillText(text.toUpperCase(), canvas.width / 2, canvas.height / 2 - 10);

        // Subtext / Badge
        ctx.font = '700 36px "SF Mono", Monaco, Consolas, monospace';
        ctx.fillStyle = '#f8fafc';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.fillText('CUSTOM TRAILER DESIGN', canvas.width / 2, canvas.height / 2 + 85);
      } else {
        // Frame / Rub Rail Compact Badge Decal
        // Dark pill plate background
        ctx.fillStyle = 'rgba(12, 14, 18, 0.85)';
        ctx.beginPath();
        ctx.roundRect(40, 16, canvas.width - 80, canvas.height - 32, 14);
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.stroke();

        // High-vis text
        ctx.font = '900 52px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = color;
        ctx.fillText(text.toUpperCase(), canvas.width / 2, canvas.height / 2);
      }
    }

    if (this.cache.size >= 32) {
      const oldest = this.cache.keys().next().value;
      this.cache.get(oldest).dispose(); this.cache.delete(oldest);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.generateMipmaps = true;

    this.cache.set(key, texture);
    return texture;
  }

  /**
   * Creates a decal mesh plane ready to attach to the trailer.
   */
  createDecalMesh(text, color, widthM, heightM, fullSide = false) {
    const texture = this.createDecalTexture(text, color, fullSide);
    const geo = new THREE.PlaneGeometry(widthM, heightM);
    const mat = new THREE.MeshStandardMaterial({
      map: texture,
      transparent: true,
      roughness: 0.35,
      metalness: 0.1,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1
    });

    mat.userData.owned = true;
    const mesh = new THREE.Mesh(geo, mat);
    mesh.name = 'Trailer_Decal_Signage';
    return mesh;
  }

  dispose() {
    this.cache.forEach(tex => tex.dispose());
    this.cache.clear();
  }
}

export const decalFactory = new DecalFactory();
