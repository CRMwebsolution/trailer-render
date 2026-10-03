import * as THREE from 'three';
import { MODEL_GEOMETRY } from '../core/modelGeometry.js';
import { decalFactory } from '../scene/DecalFactory.js';

export function buildTrailerHardware(trailer, config, metrics) {
  const zinc = trailer.materials.getMaterial('zinc_hardware'), iron = trailer.materials.getMaterial('black_iron');
  const { bedLengthM: length, bedWidthM: width, deckHeightM: deckY } = metrics;
  const couplerY = metrics.couplerHeightIn * .0254;
  const reach = config.hitchStyle === 'gooseneck' ? MODEL_GEOMETRY.gooseneckReachM : MODEL_GEOMETRY.bumperTongueM;
  const matrix = new THREE.Matrix4(), quaternion = new THREE.Quaternion(), scale = new THREE.Vector3(1, 1, 1);
  const tangentAxis = new THREE.Vector3(0, 1, 0);
  const linkGeometry = new THREE.TorusGeometry(.017, .0035, 5, 10); linkGeometry.scale(1, 1.35, 1);
  for (const side of [-1, 1]) {
    const start = new THREE.Vector3(-reach + .55, couplerY + .02, side * .13);
    const end = new THREE.Vector3(-reach - .08, couplerY + .01, side * .20);
    const curve = new THREE.QuadraticBezierCurve3(start, new THREE.Vector3(-reach + .2, couplerY - .32, side * .2), end);
    const links = new THREE.InstancedMesh(linkGeometry, zinc, 32); links.name = 'Safety_Chain_Links';
    for (let i = 0; i < 32; i++) {
      const t = i / 31; quaternion.setFromUnitVectors(tangentAxis, curve.getTangent(t).normalize());
      if (i % 2) quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(tangentAxis, Math.PI / 2));
      matrix.compose(curve.getPoint(t), quaternion, scale); links.setMatrixAt(i, matrix);
    }
    links.castShadow = true; trailer.hitchGroup.add(links);
  }
  const wirePath = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-reach + .2, couplerY + .10, .14), new THREE.Vector3(-.35, couplerY + .09, .22),
    new THREE.Vector3(.2, deckY - .08, width * .37), new THREE.Vector3(length - .2, deckY - .09, width * .37)
  ]);
  const wire = new THREE.Mesh(new THREE.TubeGeometry(wirePath, 28, .007, 6, false), iron);
  wire.name = 'Trailer_Wiring_Loom'; trailer.accessoriesGroup.add(wire);
  const plug = new THREE.Mesh(new THREE.CylinderGeometry(.017, .017, .06, 10), iron);
  plug.rotation.z = Math.PI / 2; plug.position.copy(wirePath.getPoint(0)); trailer.hitchGroup.add(plug);
  const junction = new THREE.Mesh(new THREE.BoxGeometry(.16, .055, .12), iron);
  junction.position.set(-.35, couplerY + .08, .20); junction.name = 'Wiring_Junction_Box'; trailer.hitchGroup.add(junction);

  const boltPositions = [];
  for (let x = .3; x < length; x += .61) for (const side of [-1, 1]) {
    boltPositions.push(new THREE.Vector3(x, deckY - .04, side * (width / 2 + .025)));
    if (config.trailerType === 'cargo') for (const y of [.12, MODEL_GEOMETRY.cargoBoxHeightM - .12]) boltPositions.push(new THREE.Vector3(x, deckY + y, side * (width / 2 + .024)));
  }
  const boltGeometry = new THREE.CylinderGeometry(.008, .008, .009, 6); boltGeometry.rotateX(Math.PI / 2);
  const bolts = new THREE.InstancedMesh(boltGeometry, zinc, boltPositions.length); bolts.name = 'Rail_Fasteners';
  boltPositions.forEach((point, i) => { matrix.makeTranslation(point.x, point.y, point.z); bolts.setMatrixAt(i, matrix); });
  if (config.trailerType === 'cargo') bolts.userData.cutaway = true;
  trailer.chassisGroup.add(bolts);

  if (config.hitchStyle === 'bumper_pull' && config.trailerType !== 'flatbed') {
    const latch = new THREE.Mesh(new THREE.BoxGeometry(.12, .022, .045), zinc);
    latch.position.set(-reach + .015, couplerY + .115, 0); latch.name = 'Coupler_Latch'; trailer.hitchGroup.add(latch);
  }
  const plate = new THREE.Mesh(new THREE.BoxGeometry(.015, .13, .28), iron);
  plate.name = 'Rear_Plate_Bracket'; plate.position.set(length + .055, Math.max(.25, deckY - .16), 0); trailer.accessoriesGroup.add(plate);
  const badge = decalFactory.createDecalMesh('PRO-TRAILER', '#e2e8f0', .25, .10);
  badge.rotation.y = Math.PI / 2; badge.position.copy(plate.position); badge.position.x += .009; trailer.accessoriesGroup.add(badge);
}
