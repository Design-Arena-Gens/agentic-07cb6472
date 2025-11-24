/* eslint-disable react/no-unknown-property */
"use client";
import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Float, ContactShadows, Environment, PresentationControls } from "@react-three/drei";
import { EffectComposer, DepthOfField, Bloom, Vignette, ToneMapping } from "@react-three/postprocessing";

const DURATION_S = 8;

function useTimeline() {
  const [t, setT] = useState(0);
  useEffect(() => {
    let raf = 0;
    let start = performance.now();
    const loop = () => {
      const elapsed = (performance.now() - start) / 1000;
      const clamped = Math.min(elapsed, DURATION_S);
      setT(clamped);
      if (clamped < DURATION_S) {
        raf = requestAnimationFrame(loop);
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  return t;
}

function DirtPath() {
  const path = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(
      [
        new THREE.Vector3(-3.5, 0, 0.6),
        new THREE.Vector3(-2.0, 0, 0.15),
        new THREE.Vector3(-0.8, 0, -0.1),
        new THREE.Vector3(0.8, 0, -0.15),
        new THREE.Vector3(2.2, 0, 0.0),
        new THREE.Vector3(3.6, 0, 0.4),
      ],
      false,
      "catmullrom",
      0.5
    );
    return curve;
  }, []);
  const geom = useMemo(() => new THREE.PlaneGeometry(10, 3, 1, 1), []);
  const mat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color("#7b5b3e"),
        roughness: 1,
        metalness: 0,
      }),
    []
  );
  return (
    <group rotation-x={-Math.PI / 2} position-y={0.001}>
      <mesh geometry={geom} material={mat} position-z={0} />
    </group>
  );
}

function GrassField() {
  const inst = useRef<THREE.InstancedMesh>(null!);
  const count = 1200;
  const dummy = useMemo(() => new THREE.Object3D(), []);
  useEffect(() => {
    for (let i = 0; i < count; i++) {
      const x = THREE.MathUtils.randFloatSpread(10);
      const z = THREE.MathUtils.randFloatSpread(6);
      if (Math.abs(z) < 1.5) continue; // keep grassy area off the path
      const y = 0;
      dummy.position.set(x, y, z);
      dummy.rotation.set(-Math.PI / 2, 0, THREE.MathUtils.randFloatSpread(0.3));
      const s = THREE.MathUtils.randFloat(0.015, 0.035);
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      inst.current.setMatrixAt(i, dummy.matrix);
      const hue = 0.33 + THREE.MathUtils.randFloatSpread(0.04);
      const color = new THREE.Color().setHSL(hue, 0.6, THREE.MathUtils.randFloat(0.3, 0.45));
      inst.current.setColorAt(i, color);
    }
    inst.current.instanceMatrix.needsUpdate = true;
    // @ts-ignore
    if (inst.current.instanceColor) inst.current.instanceColor.needsUpdate = true;
  }, [count, dummy]);
  return (
    <instancedMesh ref={inst} args={[undefined as any, undefined as any, count]}>
      <cylinderGeometry args={[0.2, 0.05, 1.0, 3, 1]} />
      <meshStandardMaterial vertexColors roughness={0.9} metalness={0.0} />
    </instancedMesh>
  );
}

function Rocks() {
  const rocks = new Array(24).fill(0).map((_, i) => ({
    position: [THREE.MathUtils.randFloatSpread(10), 0.08, THREE.MathUtils.randFloatSpread(6)] as [number, number, number],
    scale: THREE.MathUtils.randFloat(0.08, 0.22),
  }));
  return (
    <group>
      {rocks.map((r, i) => (
        <mesh key={i} position={r.position} scale={r.scale} castShadow receiveShadow>
          <icosahedronGeometry args={[1, 1]} />
          <meshStandardMaterial color={"#8e8f92"} roughness={0.95} metalness={0.0} />
        </mesh>
      ))}
    </group>
  );
}

function MiniTrees() {
  const trees = new Array(8).fill(0).map((_, i) => ({
    x: -3.5 + i * 1.0,
    z: i % 2 === 0 ? -2.2 : 2.2,
  }));
  return (
    <group>
      {trees.map((t, i) => (
        <group key={i} position={[t.x, 0, t.z]}>
          <mesh position={[0, 0.1, 0]} castShadow>
            <cylinderGeometry args={[0.05, 0.08, 0.4, 6]} />
            <meshStandardMaterial color={"#6b4f3b"} roughness={1} />
          </mesh>
          <Float speed={1.5} rotationIntensity={0.1} floatIntensity={0.2}>
            <mesh position={[0, 0.45, 0]} castShadow>
              <icosahedronGeometry args={[0.35, 0]} />
              <meshStandardMaterial color={"#2b5d38"} roughness={0.95} />
            </mesh>
          </Float>
        </group>
      ))}
    </group>
  );
}

function Dust({ origin }: { origin: THREE.Object3D }) {
  const ref = useRef<THREE.Points>(null!);
  const count = 80;
  const positions = useMemo(() => new Float32Array(count * 3), [count]);
  const speeds = useMemo(() => new Float32Array(count), [count]);
  useEffect(() => {
    for (let i = 0; i < count; i++) {
      speeds[i] = THREE.MathUtils.randFloat(0.2, 0.8);
    }
  }, [count, speeds]);
  useEffect(() => {
    const geom = ref.current.geometry as THREE.BufferGeometry;
    geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  }, [positions]);
  useEffect(() => {
    const id = setInterval(() => {
      const geom = ref.current.geometry as THREE.BufferGeometry;
      const pos = geom.getAttribute("position") as THREE.BufferAttribute;
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const r = Math.random() * 0.2;
        pos.setXYZ(i, origin.position.x + Math.cos(angle) * r, origin.position.y + 0.06, origin.position.z + Math.sin(angle) * r);
      }
      pos.needsUpdate = true;
    }, 160);
    return () => clearInterval(id);
  }, [count, origin]);
  useEffect(() => {
    let raf = 0;
    const geom = ref.current.geometry as THREE.BufferGeometry;
    const pos = geom.getAttribute("position") as THREE.BufferAttribute;
    const step = () => {
      for (let i = 0; i < count; i++) {
        const y = pos.getY(i) + speeds[i] * 0.008;
        const x = pos.getX(i) + THREE.MathUtils.randFloatSpread(0.002);
        const z = pos.getZ(i) + THREE.MathUtils.randFloatSpread(0.002);
        pos.setXYZ(i, x, y, z);
      }
      pos.needsUpdate = true;
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [count, speeds]);
  return (
    <points ref={ref}>
      <bufferGeometry />
      <pointsMaterial color="#cbb192" size={0.02} sizeAttenuation transparent opacity={0.7} depthWrite={false} />
    </points>
  );
}

function Jax({ t, cameraTarget }: { t: number; cameraTarget: THREE.Object3D }) {
  const group = useRef<THREE.Group>(null!);
  const leftWheel = useRef<THREE.Mesh>(null!);
  const rightWheel = useRef<THREE.Mesh>(null!);
  const face = useRef<THREE.Mesh>(null!);
  const curve = useMemo(() => {
    return new THREE.CatmullRomCurve3(
      [
        new THREE.Vector3(-3.3, 0.09, 0.5),
        new THREE.Vector3(-2.0, 0.09, 0.15),
        new THREE.Vector3(-0.8, 0.09, -0.1),
        new THREE.Vector3(0.8, 0.09, -0.15),
        new THREE.Vector3(2.2, 0.09, 0.0),
        new THREE.Vector3(3.3, 0.09, 0.35),
      ],
      false,
      "catmullrom",
      0.5
    );
  }, []);
  const dummyTarget = useMemo(() => new THREE.Vector3(), []);
  useEffect(() => {
    const u = THREE.MathUtils.clamp(t / DURATION_S, 0, 1);
    curve.getPointAt(u, dummyTarget);
    const tangent = curve.getTangentAt(u).normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), tangent.clone().normalize());
    if (group.current) {
      group.current.position.copy(dummyTarget);
      group.current.quaternion.copy(quat);
      const speed = 4.0; // wheel spin visual
      const spin = t * speed;
      leftWheel.current.rotation.x = spin;
      rightWheel.current.rotation.x = spin;
      // eye/pupil slight tracking forward
      face.current.rotation.y = Math.sin(t * 2) * 0.05;
    }
    if (cameraTarget) {
      cameraTarget.position.copy(dummyTarget);
    }
  }, [t, curve, dummyTarget, cameraTarget]);
  return (
    <group ref={group}>
      {/* body */}
      <mesh castShadow receiveShadow position={[0, 0.15, 0]}>
        <boxGeometry args={[0.6, 0.25, 0.35]} />
        <meshStandardMaterial color={"#d3322b"} roughness={0.5} metalness={0.2} />
      </mesh>
      {/* bumper */}
      <mesh castShadow receiveShadow position={[0.25, 0.08, 0]}>
        <boxGeometry args={[0.2, 0.1, 0.38]} />
        <meshStandardMaterial color={"#8a1f1a"} roughness={0.9} />
      </mesh>
      {/* wheels */}
      <mesh ref={leftWheel} castShadow receiveShadow position={[0, 0.07, 0.18]} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.09, 0.09, 0.22, 16]} />
        <meshStandardMaterial color={"#2b2b2b"} roughness={1} />
      </mesh>
      <mesh ref={rightWheel} castShadow receiveShadow position={[0, 0.07, -0.18]} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.09, 0.09, 0.22, 16]} />
        <meshStandardMaterial color={"#2b2b2b"} roughness={1} />
      </mesh>
      {/* face/headlights */}
      <group position={[0.18, 0.18, 0]}>
        <mesh ref={face} position={[0.08, 0.02, 0]}>
          <boxGeometry args={[0.06, 0.06, 0.28]} />
          <meshStandardMaterial color={"#ffdedb"} roughness={0.4} />
        </mesh>
        {/* eyes */}
        <mesh position={[0.1, 0.02, 0.09]}>
          <sphereGeometry args={[0.035, 16, 16]} />
          <meshStandardMaterial color={"#ffffff"} emissive={"#ffd8d6"} emissiveIntensity={0.15} />
        </mesh>
        <mesh position={[0.1, 0.02, -0.09]}>
          <sphereGeometry args={[0.035, 16, 16]} />
          <meshStandardMaterial color={"#ffffff"} emissive={"#ffd8d6"} emissiveIntensity={0.15} />
        </mesh>
        {/* pupils */}
        <mesh position={[0.13, 0.02, 0.09]}>
          <sphereGeometry args={[0.015, 12, 12]} />
          <meshStandardMaterial color={"#1b1b1b"} />
        </mesh>
        <mesh position={[0.13, 0.02, -0.09]}>
          <sphereGeometry args={[0.015, 12, 12]} />
          <meshStandardMaterial color={"#1b1b1b"} />
        </mesh>
      </group>
    </group>
  );
}

function Nino({ t }: { t: number }) {
  const group = useRef<THREE.Group>(null!);
  const bag = useRef<THREE.Mesh>(null!);
  useEffect(() => {
    const delay = 0.25; // starts slightly behind
    const u = THREE.MathUtils.clamp((t - delay) / DURATION_S, 0, 0.95);
    const x = -3.6 + 7.0 * u;
    const z = 0.32 * Math.sin(u * Math.PI * 1.6) + 0.02;
    const y = 0.12 + 0.02 * Math.sin(u * 20);
    group.current.position.set(x, y, z);
    group.current.rotation.y = 0.1 * Math.sin(u * 8);
    const sway = 0.5 * Math.sin(t * 6);
    bag.current.rotation.z = sway;
  }, [t]);
  return (
    <group ref={group}>
      {/* body */}
      <mesh position={[0, 0.14, 0]} castShadow>
        <capsuleGeometry args={[0.08, 0.18, 8, 16]} />
        <meshStandardMaterial color={"#3a87d6"} roughness={0.5} />
      </mesh>
      {/* eyes */}
      <mesh position={[0.07, 0.18, 0.03]}>
        <sphereGeometry args={[0.015, 12, 12]} />
        <meshStandardMaterial color={"#fefefe"} />
      </mesh>
      <mesh position={[0.07, 0.18, -0.03]}>
        <sphereGeometry args={[0.015, 12, 12]} />
        <meshStandardMaterial color={"#fefefe"} />
      </mesh>
      {/* antenna */}
      <mesh position={[0, 0.28, 0]}>
        <cylinderGeometry args={[0.006, 0.006, 0.08, 8]} />
        <meshStandardMaterial color={"#b7d9ff"} roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.325, 0]}>
        <sphereGeometry args={[0.012, 12, 12]} />
        <meshStandardMaterial color={"#b7d9ff"} />
      </mesh>
      {/* arms */}
      <mesh position={[-0.05, 0.15, 0.07]}>
        <cylinderGeometry args={[0.01, 0.01, 0.14, 8]} />
        <meshStandardMaterial color={"#9dc3f0"} />
      </mesh>
      <mesh position={[-0.05, 0.15, -0.07]}>
        <cylinderGeometry args={[0.01, 0.01, 0.14, 8]} />
        <meshStandardMaterial color={"#9dc3f0"} />
      </mesh>
      {/* tool bag */}
      <mesh ref={bag} position={[-0.05, 0.1, 0.12]} castShadow>
        <boxGeometry args={[0.12, 0.08, 0.06]} />
        <meshStandardMaterial color={"#e2b04a"} roughness={0.8} />
      </mesh>
    </group>
  );
}

function Ground() {
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[12, 8, 32, 32]} />
        <meshStandardMaterial color={"#6f8b55"} roughness={1} />
      </mesh>
      <DirtPath />
      <GrassField />
      <Rocks />
      <MiniTrees />
    </group>
  );
}

function Lights() {
  return (
    <group>
      <hemisphereLight args={[0xfff6e9, 0x223344, 0.45]} />
      <directionalLight
        castShadow
        color={new THREE.Color("#ffe2b3")}
        position={[2.8, 3.5, 2.5]}
        intensity={2.2}
        shadow-mapSize={[1024, 1024]}
      />
    </group>
  );
}

function PostFX() {
  return (
    <EffectComposer multisampling={4}>
      <ToneMapping />
      <DepthOfField focusDistance={0.008} focalLength={0.018} bokehScale={2.2} />
      <Bloom intensity={0.3} luminanceThreshold={0.6} mipmapBlur />
      <Vignette darkness={0.35} offset={0.25} />
    </EffectComposer>
  );
}

function Scene() {
  const t = useTimeline();
  const cameraTarget = useRef<THREE.Object3D>(new THREE.Object3D());
  const cameraRig = useRef<THREE.Group>(null!);
  const jaxRef = useRef<THREE.Object3D>(null!);
  useEffect(() => {
    if (!cameraRig.current) return;
    const u = THREE.MathUtils.clamp(t / DURATION_S, 0, 1);
    const offset = new THREE.Vector3(-0.4, 0.18, 0.6);
    const base = cameraTarget.current.position.clone();
    const pos = base.clone().add(offset);
    cameraRig.current.position.lerp(pos, 0.9);
    cameraRig.current.lookAt(base.x + 0.4, base.y + 0.05, base.z);
  }, [t]);
  return (
    <>
      <Lights />
      <group ref={cameraRig} />
      <Ground />
      <Jax t={t} cameraTarget={cameraTarget.current} />
      <Nino t={t} />
      <ContactShadows position={[0, 0.001, 0]} opacity={0.35} scale={10} blur={2.2} far={3.5} />
      <Environment preset="sunset" />
      <Dust origin={cameraTarget.current} />
      <PostFX />
    </>
  );
}

function Dialogue({ t }: { t: number }) {
  const lines: { start: number; end: number; text: string }[] = [
    { start: 0.9, end: 3.0, text: 'JAX: "Come on, Nino! If you\'re slow, we won?t make it!"' },
    { start: 3.2, end: 5.4, text: 'NINO: "Wait! This bag is too heavy!"' },
  ];
  const active = lines.find((l) => t >= l.start && t <= l.end);
  return (
    <div id="dialogue">{active ? <div className="line">{active.text}</div> : null}</div>
  );
}

export default function Page() {
  const t = useTimeline();
  return (
    <>
      <div className="brand">JAX & NINO ? Miniature Morning Chase</div>
      <div className="credits">8s ? Pixar-style ? R3F</div>
      <Canvas
        shadows
        gl={{ antialias: true, physicallyCorrectLights: true, outputColorSpace: THREE.SRGBColorSpace }}
        camera={{ position: [0, 0.2, 1.4], fov: 50, near: 0.01, far: 50 }}
      >
        <color attach="background" args={[new THREE.Color("#0b0d10")]} />
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>
      <Dialogue t={t} />
    </>
  );
}

