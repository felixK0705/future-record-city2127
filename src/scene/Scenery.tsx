// 遠景：グラデーションの空、流れる雲、遠くの山並みと街並み

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Instanced, type InstanceSpec } from './Instanced';
import { GEO } from './geometries';

/** 空の色（Atmosphere から毎フレーム書き換える） */
export const skyUniforms = {
  topColor: { value: new THREE.Color('#7fb0dc') },
  horizonColor: { value: new THREE.Color('#dbe3e6') },
};

const vertexShader = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 topColor;
  uniform vec3 horizonColor;
  varying vec3 vWorld;
  void main() {
    float h = normalize(vWorld - cameraPosition).y;
    float t = pow(clamp(h * 1.6, 0.0, 1.0), 0.7);
    vec3 col = mix(horizonColor, topColor, t);
    gl_FragColor = vec4(col, 1.0);
  }
`;

function SkyDome() {
  const mesh = useRef<THREE.Mesh>(null);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: skyUniforms,
        vertexShader,
        fragmentShader,
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
      }),
    [],
  );
  // 空はいつもカメラを中心にする
  useFrame(({ camera }) => {
    mesh.current?.position.copy(camera.position);
  });
  return (
    <mesh ref={mesh} material={material} renderOrder={-1} frustumCulled={false}>
      <sphereGeometry args={[420, 32, 16]} />
    </mesh>
  );
}

/** 雲：平たい球を寄せ集めたかたまり */
function Clouds() {
  const group = useRef<THREE.Group>(null);
  const specs = useMemo(() => {
    const out: InstanceSpec[] = [];
    for (let c = 0; c < 16; c++) {
      const a = (c / 16) * Math.PI * 2 + Math.sin(c * 3.1) * 0.3;
      const r = 150 + (c % 4) * 35;
      const cx = Math.cos(a) * r;
      const cz = Math.sin(a) * r;
      const cy = 70 + (c % 3) * 14;
      for (let k = 0; k < 5; k++) {
        const s = 14 + ((c * 7 + k * 3) % 9) * 2;
        out.push({
          x: cx + (k - 2) * 9 + Math.sin(c + k) * 4,
          y: cy + Math.cos(k * 1.7) * 3,
          z: cz + Math.cos(c * 2 + k) * 6,
          sx: s * 1.4,
          sy: s * 0.45,
          sz: s,
          color: k % 2 ? '#ffffff' : '#f1f4f8',
        });
      }
    }
    return out;
  }, []);
  useFrame((_, dt) => {
    if (group.current) group.current.rotation.y += Math.min(dt, 0.1) * 0.004;
  });
  return (
    <group ref={group}>
      <Instanced specs={specs} geometry={GEO.blob} unlit castShadow={false} receiveShadow={false} />
    </group>
  );
}

/** 遠くの山並みとビル群のシルエット */
function Horizon() {
  const { mountains, skyline } = useMemo(() => {
    const mountains: InstanceSpec[] = [];
    for (let i = 0; i < 22; i++) {
      const a = (i / 22) * Math.PI * 2;
      const r = 300 + (i % 3) * 25;
      const h = 45 + ((i * 37) % 5) * 14;
      mountains.push({
        x: Math.cos(a) * r,
        y: h / 2 - 2,
        z: Math.sin(a) * r,
        sx: 110 + (i % 4) * 20,
        sy: h,
        sz: 90,
        ry: a,
        color: i % 2 ? '#a9bccd' : '#b5c6d5',
      });
    }
    const skyline: InstanceSpec[] = [];
    for (let i = 0; i < 70; i++) {
      const a = (i / 70) * Math.PI * 2;
      const r = 165 + ((i * 13) % 5) * 10;
      const h = 10 + ((i * 29) % 7) * 6;
      skyline.push({
        x: Math.cos(a) * r,
        y: h / 2,
        z: Math.sin(a) * r,
        sx: 9 + (i % 3) * 4,
        sy: h,
        sz: 9,
        ry: -a,
        color: ['#c3ccd6', '#cdd2d9', '#bac4cf'][i % 3],
      });
    }
    return { mountains, skyline };
  }, []);
  return (
    <group>
      <Instanced specs={mountains} geometry={GEO.coneLow} castShadow={false} receiveShadow={false} />
      <Instanced specs={skyline} geometry={GEO.box} castShadow={false} receiveShadow={false} />
    </group>
  );
}

export function Scenery() {
  return (
    <group>
      <SkyDome />
      <Clouds />
      <Horizon />
    </group>
  );
}
