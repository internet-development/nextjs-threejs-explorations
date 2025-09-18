import React, { useEffect } from 'react';
import * as THREE from 'three';
import { ParametricGeometry } from 'three/examples/jsm/geometries/ParametricGeometry';

interface Position {
  x: number;
  y: number;
  z: number;
}

export interface SimulationContext {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  registerSimulationUpdate: (callback: (time: number) => void) => void;
  unregisterSimulationUpdate: (callback: (time: number) => void) => void;
}

interface ClothProps {
  simulation?: SimulationContext;
  parent?: THREE.Group | THREE.Scene;
  clothTextureURL?: string;
  initialPosition?: Position;
  pinIndices?: number[];
}

const Cloth: React.FC<ClothProps> = ({ simulation, parent, clothTextureURL, initialPosition = { x: 0, y: 0, z: 0 }, pinIndices }) => {
  useEffect(() => {
    if (!simulation || !simulation.camera) return;
    const targetParent = parent || simulation.scene;
    const desiredClothWidth = 250;
    const xSegs = 9;
    const ySegs = 16;
    const restDistance = desiredClothWidth / xSegs;
    const DAMPING = 0.005;
    const DRAG = 1 - DAMPING;
    const MASS = 0.1;
    const GRAVITY = 100;
    const TIMESTEP = 18 / 1000;
    const TIMESTEP_SQ = TIMESTEP * TIMESTEP;
    const offset = new THREE.Vector3(initialPosition.x - desiredClothWidth / 2, initialPosition.y, initialPosition.z);
    const basePlane = (width: number, height: number) => (u: number, v: number, target: THREE.Vector3) => {
      const x = u * width;
      const y = -v * height;
      target.set(x, y, 0);
    };
    const baseClothFunction = basePlane(desiredClothWidth, restDistance * ySegs);
    const clothFunction = (u: number, v: number, target: THREE.Vector3) => {
      baseClothFunction(u, v, target);
      target.add(offset);
    };
    class Particle {
      position: THREE.Vector3;
      previous: THREE.Vector3;
      original: THREE.Vector3;
      a: THREE.Vector3;
      mass: number;
      invMass: number;
      tmp: THREE.Vector3;
      tmp2: THREE.Vector3;
      constructor(u: number, v: number, mass: number) {
        this.position = new THREE.Vector3();
        this.previous = new THREE.Vector3();
        this.original = new THREE.Vector3();
        this.a = new THREE.Vector3(0, 0, 0);
        this.mass = mass;
        this.invMass = 1 / mass;
        this.tmp = new THREE.Vector3();
        this.tmp2 = new THREE.Vector3();
        clothFunction(u, v, this.position);
        clothFunction(u, v, this.previous);
        clothFunction(u, v, this.original);
      }
      addForce(force: THREE.Vector3) {
        this.a.add(this.tmp2.copy(force).multiplyScalar(this.invMass));
      }
      integrate(timesq: number) {
        const newPos = this.tmp.subVectors(this.position, this.previous);
        newPos.multiplyScalar(DRAG).add(this.position);
        newPos.add(this.a.multiplyScalar(timesq));
        this.tmp = this.previous;
        this.previous = this.position;
        this.position = newPos;
        this.a.set(0, 0, 0);
      }
    }
    class ClothSim {
      w: number;
      h: number;
      particles: Particle[];
      constraints: Array<[Particle, Particle, number]>;
      constructor(w: number, h: number) {
        this.w = w;
        this.h = h;
        this.particles = [];
        this.constraints = [];
        for (let v = 0; v <= h; v++) {
          for (let u = 0; u <= w; u++) {
            this.particles.push(new Particle(u / w, v / h, MASS));
          }
        }
        const index = (u: number, v: number) => u + v * (w + 1);
        for (let v = 0; v < h; v++) {
          for (let u = 0; u < w; u++) {
            this.constraints.push([this.particles[index(u, v)], this.particles[index(u, v + 1)], restDistance]);
            this.constraints.push([this.particles[index(u, v)], this.particles[index(u + 1, v)], restDistance]);
          }
        }
        for (let v = 0; v < h; v++) {
          this.constraints.push([this.particles[index(w, v)], this.particles[index(w, v + 1)], restDistance]);
        }
        for (let u = 0; u < w; u++) {
          this.constraints.push([this.particles[index(u, h)], this.particles[index(u + 1, h)], restDistance]);
        }
      }
    }
    const diff = new THREE.Vector3();
    function satisfyConstraints(p1: Particle, p2: Particle, distance: number) {
      diff.subVectors(p2.position, p1.position);
      const currentDist = diff.length();
      if (currentDist === 0) return;
      const correction = diff.multiplyScalar(1 - distance / currentDist);
      const correctionHalf = correction.multiplyScalar(0.5);
      p1.position.add(correctionHalf);
      p2.position.sub(correctionHalf);
    }
    const clothSim = new ClothSim(xSegs, ySegs);
    const clothGeometry = new ParametricGeometry(clothFunction, xSegs, ySegs);
    let material: THREE.Material;
    if (clothTextureURL) {
      const loader = new THREE.TextureLoader();
      const texture = loader.load(clothTextureURL);
      texture.flipY = false;
      texture.anisotropy = 16;
      material = new THREE.MeshPhongMaterial({
        map: texture,
        side: THREE.DoubleSide,
        shininess: 100,
        specular: new THREE.Color(0x222222),
      });
    } else {
      material = new THREE.MeshPhongMaterial({
        color: 0xffffff,
        side: THREE.DoubleSide,
        shininess: 100,
        specular: new THREE.Color(0x222222),
      });
    }
    const mesh = new THREE.Mesh(clothGeometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    targetParent.add(mesh);
    const poleMat = new THREE.MeshPhongMaterial({
      color: 0xffffff,
      shininess: 200,
      specular: new THREE.Color(0xffffff),
      emissive: new THREE.Color(0xffffff),
      emissiveIntensity: 0.15,
    });
    const poleExtra = 400;
    const poleHeight = restDistance * ySegs + poleExtra;
    const poleGeo = new THREE.BoxGeometry(5, poleHeight, 5);
    const poleMesh = new THREE.Mesh(poleGeo, poleMat);
    poleMesh.position.set(initialPosition.x + desiredClothWidth / 2 + 2.5, initialPosition.y - poleHeight / 2, initialPosition.z);
    poleMesh.receiveShadow = true;
    poleMesh.castShadow = true;
    targetParent.add(poleMesh);
    let pins = pinIndices;
    if (!pins) {
      pins = [];
      for (let v = 0; v <= ySegs; v++) {
        pins.push(xSegs + v * (xSegs + 1));
      }
    }
    const simulate = (time: number) => {
      const minWind = 24;
      const maxWind = 228;
      const windStrength = minWind + (maxWind - minWind) * ((Math.sin(time / 1000) + 1) / 2);
      const forward = new THREE.Vector3();
      simulation.camera.getWorldDirection(forward);
      const right = new THREE.Vector3();
      right.crossVectors(forward, simulation.camera.up).normalize();
      const worldWind = right.clone().negate().multiplyScalar(windStrength);
      const worldGravity = new THREE.Vector3(0, -GRAVITY * MASS, 0);
      let effectiveGravity = worldGravity;
      let effectiveWind = worldWind;
      if (targetParent !== simulation.scene) {
        const parentQuat = new THREE.Quaternion();
        targetParent.getWorldQuaternion(parentQuat);
        parentQuat.invert();
        effectiveGravity = worldGravity.clone().applyQuaternion(parentQuat);
        effectiveWind = worldWind.clone().applyQuaternion(parentQuat);
      }
      const particles = clothSim.particles;
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.addForce(effectiveGravity);
        p.addForce(effectiveWind);
        p.integrate(TIMESTEP_SQ);
      }
      for (let i = 0; i < clothSim.constraints.length; i++) {
        const [p1, p2, distance] = clothSim.constraints[i];
        satisfyConstraints(p1, p2, distance);
      }
      for (let i = 0; i < pins.length; i++) {
        const index = pins[i];
        const p = particles[index];
        const row = Math.floor(index / (xSegs + 1));
        const vFraction = row / ySegs;
        const desiredPos = new THREE.Vector3();
        baseClothFunction(1, vFraction, desiredPos);
        desiredPos.add(offset).add(new THREE.Vector3(2.5, 0, 0));
        p.position.copy(desiredPos);
        p.previous.copy(desiredPos);
      }
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const dx = p.position.x - poleMesh.position.x;
        const dz = p.position.z - poleMesh.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        const radius = 2.5;
        if (dist < radius && dist > 0) {
          const correction = radius - dist;
          p.position.x += (dx / dist) * correction;
          p.position.z += (dz / dist) * correction;
        }
      }
      for (let i = 0; i < particles.length; i++) {
        const pos = particles[i].position;
        clothGeometry.attributes.position.setXYZ(i, pos.x, pos.y, pos.z);
      }
      clothGeometry.attributes.position.needsUpdate = true;
      clothGeometry.computeVertexNormals();
      clothGeometry.computeBoundingSphere();
    };
    simulation.registerSimulationUpdate(simulate);
    return () => {
      simulation.unregisterSimulationUpdate(simulate);
      targetParent.remove(mesh);
      targetParent.remove(poleMesh);
      clothGeometry.dispose();
      if (material instanceof THREE.MeshPhongMaterial && material.map) material.map.dispose();
      material.dispose();
      poleGeo.dispose();
    };
  }, [simulation, parent, clothTextureURL, initialPosition, pinIndices]);
  return null;
};

export default Cloth;
