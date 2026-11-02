// La fusion des objets immobiles : les mêmes triangles, au même endroit, moins d'objets.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { fusionnerImmobiles } from './outils3d.ts';

test('deux objets de même matière n\'en font qu\'un, sans perdre un triangle', () => {
  const racine = new THREE.Group();
  const a = new THREE.MeshBasicMaterial(), b = new THREE.MeshBasicMaterial();
  const m1 = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), a); m1.position.x = 10;
  const m2 = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), a); m2.position.x = -10;
  const m3 = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), [a, a, b, b, a, a]);
  racine.add(m1, m2, m3);
  const s = fusionnerImmobiles(racine, () => false);
  assert.equal(s.length, 2);
  assert.equal(racine.children.length, 2);
  const tris = (m: THREE.Mesh) => m.geometry.index!.count / 3;
  assert.equal(tris(s.find((m) => m.material === a)!), 12 + 12 + 8);
  assert.equal(tris(s.find((m) => m.material === b)!), 4);
  const bb = new THREE.Box3().setFromBufferAttribute(s.find((m) => m.material === a)!.geometry.attributes.position as THREE.BufferAttribute);
  assert.equal(bb.max.x, 10.5);
  assert.equal(bb.min.x, -10.5);
});

test('une ombre différente ou un objet gardé restent à part', () => {
  const racine = new THREE.Group();
  const a = new THREE.MeshBasicMaterial();
  const m1 = new THREE.Mesh(new THREE.BoxGeometry(), a); m1.castShadow = true;
  const m2 = new THREE.Mesh(new THREE.BoxGeometry(), a);
  const garde = new THREE.Group(); garde.add(new THREE.Mesh(new THREE.BoxGeometry(), a));
  racine.add(m1, m2, garde);
  const s = fusionnerImmobiles(racine, (o) => o === garde);
  assert.equal(s.length, 2);
  assert.ok(racine.children.includes(garde));
  assert.equal(garde.children.length, 1);
});
