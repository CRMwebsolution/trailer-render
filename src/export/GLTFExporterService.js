/**
 * GLTFExporterService.js
 * Generates and triggers download of optimized binary .glb 3D trailer models.
 */
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

export class GLTFExporterService {
  constructor() {
    this.exporter = new GLTFExporter();
  }

  /**
   * Exports the trailer group as a binary .glb file.
   * @param {THREE.Object3D} trailerRootGroup 
   * @param {Object} state 
   * @param {Object} metrics 
   * @returns {Promise<void>}
   */
  exportGLB(trailerRootGroup, state, metrics) {
    return new Promise((resolve, reject) => {
      if (!trailerRootGroup) {
        return reject(new Error('No active trailer model to export.'));
      }

      // Generate descriptive file name
      const typeStr = (state.trailerType || 'flatbed').toUpperCase();
      const lengthStr = `${state.bedLengthFt}FT`;
      const payloadStr = state.payloadClass || '14K';
      const hitchStr = state.hitchStyle === 'gooseneck' ? 'GOOSENECK' : 'BUMPER_PULL';
      const fileName = `Trailer_${typeStr}_${lengthStr}_${payloadStr}_${hitchStr}.glb`;

      const options = {
        binary: true,
        onlyVisible: true,
        embedImages: true,
        truncateDrawRange: true,
        animations: []
      };

      this.exporter.parse(
        trailerRootGroup,
        (result) => {
          try {
            const blob = new Blob([result], { type: 'model/gltf-binary' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(link.href), 1500);

            console.log(`GLB exported successfully: ${fileName} (${(blob.size / 1024).toFixed(1)} KB)`);
            resolve({ fileName, fileSizeKb: Math.round(blob.size / 1024) });
          } catch (err) {
            reject(err);
          }
        },
        (error) => {
          console.error('Error exporting GLTF:', error);
          reject(error);
        },
        options
      );
    });
  }
}

export const gltfExporterService = new GLTFExporterService();
