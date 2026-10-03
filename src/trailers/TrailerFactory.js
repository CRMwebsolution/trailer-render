/**
 * TrailerFactory.js
 * Registry and factory for procedural trailer classes.
 * Enables zero-touch addition of future trailer models (e.g. DumpTrailer, CargoTrailer).
 */
import { FlatbedTrailer } from './FlatbedTrailer.js';
import { DumpTrailer } from './DumpTrailer.js';
import { CargoTrailer } from './CargoTrailer.js';

export class TrailerFactory {
  constructor() {
    this.registry = new Map();
    // Register standard and future trailer classes
    this.register('flatbed', FlatbedTrailer);
    this.register('dump', DumpTrailer);
    this.register('cargo', CargoTrailer);
  }

  /**
   * Register a new trailer class.
   * @param {string} typeName 
   * @param {typeof BaseTrailer} trailerClass 
   */
  register(typeName, trailerClass) {
    this.registry.set(typeName.toLowerCase(), trailerClass);
  }

  /**
   * Instantiates a trailer subclass.
   * @param {string} typeName 
   * @param {THREE.Scene} scene 
   * @param {MaterialFactory} materialFactory 
   * @returns {BaseTrailer}
   */
  create(typeName, scene, materialFactory) {
    const key = (typeName || 'flatbed').toLowerCase();
    const TargetClass = this.registry.get(key) || FlatbedTrailer;
    return new TargetClass(scene, materialFactory);
  }

  /**
   * Returns list of registered trailer types.
   */
  getRegisteredTypes() {
    return Array.from(this.registry.keys());
  }
}

export const trailerFactory = new TrailerFactory();
