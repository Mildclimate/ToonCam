import { useRef } from "react";
import { StyleSheet, View, Text } from "react-native";
import { Canvas, useFrame, useThree } from "@react-three/fiber/native";
import * as THREE from "three";
import type { SceneObject } from "../types/SceneTypes";
import {
  buildScene3D,
  getShapeType,
  getShapeOpacity,
} from "../services/sceneRenderer";

type Scene3DViewProps = {
  objects: SceneObject[];
  status: "loading" | "ready";
};

function AbstractObject({
  position,
  size,
  color,
  label,
}: {
  position: { x: number; y: number; z: number };
  size: { width: number; height: number; depth: number };
  color: string;
  label: string;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const shapeType = getShapeType(label);
  const opacity = getShapeOpacity(0.8);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.3;
    }
  });

  const geometry = (() => {
    switch (shapeType) {
      case "cylinder":
        return (
          <cylinderGeometry
            args={[size.width / 2, size.width / 2, size.height, 8]}
          />
        );
      case "sphere":
        return <sphereGeometry args={[size.width / 2, 12, 8]} />;
      case "capsule":
        return <sphereGeometry args={[size.width / 2, 12, 8]} />;
      case "box":
      default:
        return <boxGeometry args={[size.width, size.height, size.depth]} />;
    }
  })();

  const geoRef = useRef<THREE.BufferGeometry>(null);

  return (
    <mesh ref={meshRef} position={[position.x, position.y, position.z]}>
      {geometry}
      <meshStandardMaterial
        color={color}
        transparent
        opacity={opacity}
        roughness={0.3}
        metalness={0.1}
      />
      {geoRef.current && (
        <lineSegments>
          <edgesGeometry args={[geoRef.current]} />
          <lineBasicMaterial color={color} opacity={1} transparent={false} />
        </lineSegments>
      )}
    </mesh>
  );
}

function GroundPlane() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
      <planeGeometry args={[12, 12]} />
      <meshStandardMaterial
        color="#1a1a2e"
        transparent
        opacity={0.6}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function GridLines() {
  return (
    <gridHelper args={[12, 12, "#2d2d5e", "#1a1a3e"]} position={[0, 0, 0]} />
  );
}

function SceneCamera() {
  const { camera } = useThree();

  useFrame(() => {
    camera.position.set(0, 6, 6);
    camera.lookAt(0, 0, 3);
  });

  return null;
}

function SceneContent({ objects }: { objects: SceneObject[] }) {
  const sceneData = buildScene3D(objects);

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 10, 5]} intensity={0.8} />
      <pointLight position={[-3, 5, 2]} intensity={0.3} />

      <SceneCamera />
      <GroundPlane />
      <GridLines />

      {sceneData.objects.map((obj) => (
        <AbstractObject
          key={obj.id}
          position={obj.position}
          size={obj.size}
          color={obj.color}
          label={obj.label}
        />
      ))}
    </>
  );
}

export function Scene3DView({ objects, status }: Scene3DViewProps) {
  // 模型加载中
  if (status === "loading") {
    return (
      <View style={styles.empty}>
        <Text style={styles.statusText}>Loading model...</Text>
        <Text style={styles.statusHint}>COCO-SSD initializing</Text>
      </View>
    );
  }

  // 模型就绪，无检测结果 — 扫描动画
  if (objects.length === 0) {
    return (
      <View style={styles.empty}>
        <View style={styles.emptyState}>
          <View style={styles.scanningDot} />
        </View>
        <Text style={styles.statusHint}>Scanning scene...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Canvas
        key="scene-canvas"
        camera={{ position: [0, 6, 6], fov: 50, near: 0.1, far: 30 }}
        style={styles.canvas}
      >
        <SceneContent objects={objects} />
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#050816",
    overflow: "hidden",
  },
  canvas: {
    flex: 1,
  },
  empty: {
    flex: 1,
    backgroundColor: "#050816",
    justifyContent: "center",
    alignItems: "center",
  },
  emptyState: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: "rgba(148, 163, 184, 0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  scanningDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#77aaff",
    opacity: 0.5,
  },
  statusText: {
    color: "#94a3b8",
    fontSize: 14,
    fontWeight: "500",
  },
  statusHint: {
    color: "#64748b",
    fontSize: 12,
    marginTop: 8,
  },
});
