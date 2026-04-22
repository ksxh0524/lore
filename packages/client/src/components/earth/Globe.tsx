import { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars, Sphere, Html } from '@react-three/drei';
import * as THREE from 'three';

export interface Location {
  id: string;
  name: string;
  lat: number;
  lng: number;
  worldName: string;
  createdAt: string;
}

interface GlobeProps {
  worlds?: Location[];
  onLocationClick?: (location: Location) => void;
  onEmptyClick?: () => void;
}

// Convert lat/lng to 3D position
function latLngToVector3(lat: number, lng: number, radius: number = 2) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);

  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);

  return new THREE.Vector3(x, y, z);
}

// Earth mesh component
function Earth({ onClick }: { onClick: (point: THREE.Vector3) => void }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { viewport } = useThree();

  // Create earth texture using canvas
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Ocean gradient
    const oceanGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    oceanGradient.addColorStop(0, '#1a3a5c');
    oceanGradient.addColorStop(0.5, '#2a5a8c');
    oceanGradient.addColorStop(1, '#1a3a5c');
    ctx.fillStyle = oceanGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Simple continent shapes (stylized)
    ctx.fillStyle = '#3d6b4a';

    // North America
    ctx.beginPath();
    ctx.ellipse(150, 150, 120, 80, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // South America
    ctx.beginPath();
    ctx.ellipse(220, 320, 60, 100, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Europe/Asia
    ctx.beginPath();
    ctx.ellipse(550, 140, 200, 70, 0, 0, Math.PI * 2);
    ctx.fill();

    // Africa
    ctx.beginPath();
    ctx.ellipse(500, 280, 80, 110, 0, 0, Math.PI * 2);
    ctx.fill();

    // Australia
    ctx.beginPath();
    ctx.ellipse(800, 350, 50, 40, 0, 0, Math.PI * 2);
    ctx.fill();

    // Add some cloud-like atmosphere effect
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    for (let i = 0; i < 20; i++) {
      ctx.beginPath();
      ctx.ellipse(
        Math.random() * canvas.width,
        Math.random() * canvas.height,
        30 + Math.random() * 50,
        20 + Math.random() * 30,
        0, 0, Math.PI * 2
      );
      ctx.fill();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }, []);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.0005;
    }
  });

  return (
    <group>
      {/* Atmosphere glow */}
      <Sphere args={[2.1, 64, 64]}>
        <meshBasicMaterial
          color="#4a90d9"
          transparent
          opacity={0.1}
          side={THREE.BackSide}
        />
      </Sphere>

      {/* Main earth sphere */}
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          onClick(e.point);
        }}
      >
        <sphereGeometry args={[2, 64, 64]} />
        <meshStandardMaterial
          map={texture}
          roughness={0.7}
          metalness={0.1}
        />
      </mesh>

      {/* Atmosphere rim */}
      <Sphere args={[2.05, 64, 64]}>
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.05}
          side={THREE.FrontSide}
        />
      </Sphere>
    </group>
  );
}

// Location marker component
function LocationMarker({
  location,
  onClick,
  isHovered,
  onHover,
}: {
  location: Location;
  onClick: () => void;
  isHovered: boolean;
  onHover: (hovered: boolean) => void;
}) {
  const position = latLngToVector3(location.lat, location.lng, 2);
  const markerRef = useRef<THREE.Group>(null);
  const [isVisible, setIsVisible] = useState(true);

  useFrame(() => {
    if (markerRef.current) {
      // Check if marker is on the visible side of the globe
      const cameraPosition = new THREE.Vector3(0, 0, 8);
      const distanceToCamera = markerRef.current.position.distanceTo(cameraPosition);
      setIsVisible(distanceToCamera < 7.5);
    }
  });

  return (
    <group
      ref={markerRef}
      position={position}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onPointerOver={() => onHover(true)}
      onPointerOut={() => onHover(false)}
    >
      {/* Pulsing ring */}
      <mesh>
        <ringGeometry args={[0.08, 0.12, 32]} />
        <meshBasicMaterial
          color="#0071e3"
          transparent
          opacity={isHovered ? 0.8 : 0.6}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Center dot */}
      <mesh>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshBasicMaterial color="#0071e3" />
      </mesh>

      {/* Tooltip */}
      {isHovered && isVisible && (
        <Html distanceFactor={10}>
          <div
            style={{
              background: 'rgba(0, 0, 0, 0.8)',
              color: 'white',
              padding: '8px 12px',
              borderRadius: '8px',
              fontSize: '12px',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              backdropFilter: 'blur(10px)',
            }}
          >
            <div style={{ fontWeight: 600 }}>{location.worldName}</div>
            <div style={{ opacity: 0.7 }}>{location.name}</div>
          </div>
        </Html>
      )}
    </group>
  );
}

// Scene component
function Scene({ worlds, onLocationClick, onEmptyClick }: GlobeProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 3, 5]} intensity={1} />
      <pointLight position={[-5, -3, -5]} intensity={0.5} color="#4a90d9" />

      <Stars
        radius={100}
        depth={50}
        count={3000}
        factor={4}
        saturation={0}
        fade
      />

      <Earth onClick={onEmptyClick || (() => {})} />

      {worlds?.map((world) => (
        <LocationMarker
          key={world.id}
          location={world}
          onClick={() => onLocationClick?.(world)}
          isHovered={hoveredId === world.id}
          onHover={(hovered) => setHoveredId(hovered ? world.id : null)}
        />
      ))}

      <OrbitControls
        enablePan={false}
        enableZoom={true}
        minDistance={3}
        maxDistance={10}
        autoRotate
        autoRotateSpeed={0.5}
      />
    </>
  );
}

// Main Globe component
export function Globe({ worlds, onLocationClick, onEmptyClick }: GlobeProps) {
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas
        camera={{ position: [0, 0, 6], fov: 45 }}
        style={{ background: 'transparent' }}
        gl={{ antialias: true, alpha: true }}
      >
        <Scene
          worlds={worlds}
          onLocationClick={onLocationClick}
          onEmptyClick={onEmptyClick}
        />
      </Canvas>
    </div>
  );
}
