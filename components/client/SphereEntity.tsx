import React, { useEffect } from 'react';
import * as THREE from 'three';

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

interface SphereProps {
  simulation?: SimulationContext;
  parent?: THREE.Group | THREE.Scene;
  sphereTextureURL?: string;
  initialPosition?: Position;
}

const waterRippleVertexShader = `
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec2 vUv;
  uniform float time;
  
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vUv = uv;
    
    vec3 pos = position;
    
    // Elegant water ripples with subtle displacement
    float ripple1 = sin(pos.y * 0.05 + time * 1.2) * cos(pos.x * 0.03 + time * 0.8);
    float ripple2 = sin(pos.z * 0.04 + time * 1.5) * cos(pos.y * 0.06 + time * 1.0);
    float ripple3 = sin(length(pos.xz) * 0.08 + time * 2.0) * 0.5;
    
    // Combine ripples with very subtle displacement
    float displacement = (ripple1 + ripple2 + ripple3) * 0.8;
    pos += normal * displacement;
    
    vPosition = pos;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const waterRippleFragmentShader = `
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec2 vUv;
  uniform float time;
  
  #define TAU 6.28318530718
  #define MAX_ITER 5
  
  void main() {
    float iTime = time * 0.5 + 23.0;
    
    // Use the built-in UV coordinates directly, scaled appropriately
    vec2 uv = vUv;
    
    vec2 p = mod(uv * TAU, TAU) - 250.0;
    vec2 i = vec2(p);
    float c = 1.0;
    float inten = 0.005;

    for (int n = 0; n < MAX_ITER; n++) {
      float t = iTime * (1.0 - (3.5 / float(n+1)));
      i = p + vec2(cos(t - i.x) + sin(t + i.y), sin(t - i.y) + cos(t + i.x));
      c += 1.0/length(vec2(p.x / (sin(i.x+t)/inten), p.y / (cos(i.y+t)/inten)));
    }
    
    c /= float(MAX_ITER);
    c = 1.17 - pow(c, 1.4);
    vec3 colour = vec3(pow(abs(c), 8.0));
    colour = clamp(colour + vec3(0.7, 0.7, 0.7), 0.0, 1.0);
    
    gl_FragColor = vec4(colour, 0.7);
  }
`;

const Sphere: React.FC<SphereProps> = ({ simulation, parent, sphereTextureURL, initialPosition = { x: 0, y: 0, z: 0 } }) => {
  useEffect(() => {
    if (!simulation || !simulation.camera) return;
    
    const targetParent = parent || simulation.scene;
    const sphereRadius = 78; // Reduced by another 20% (98 * 0.8)
    
    const geometry = new THREE.OctahedronGeometry(sphereRadius, 0);
    geometry.scale(1, 2.5, 1); // Make it long/tall
    
    // Create water ripple shader material
    const waterUniforms = {
      time: { value: 0.0 }
    };
    
    const waterMaterial = new THREE.ShaderMaterial({
      uniforms: waterUniforms,
      vertexShader: waterRippleVertexShader,
      fragmentShader: waterRippleFragmentShader,
      transparent: true,
      blending: THREE.NormalBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    
    const sphereMesh = new THREE.Mesh(geometry, waterMaterial);
    sphereMesh.position.set(initialPosition.x, initialPosition.y, initialPosition.z);
    sphereMesh.castShadow = true;
    sphereMesh.receiveShadow = true;
    
    targetParent.add(sphereMesh);
    
    const animateWater = (time: number) => {
      // Update shader time uniform for animation
      waterUniforms.time.value = time * 0.001;
      
      // Rotate rapidly on Y-axis
      sphereMesh.rotation.y += 0.05;
    };
    
    simulation.registerSimulationUpdate(animateWater);
    
    return () => {
      targetParent.remove(sphereMesh);
      simulation.unregisterSimulationUpdate(animateWater);
      geometry.dispose();
      waterMaterial.dispose();
    };
  }, [simulation, parent, sphereTextureURL, initialPosition]);

  return null;
};

export default Sphere;