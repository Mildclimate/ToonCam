# 3D 抽象场景渲染 — 改造计划

> 目标：将下半屏从 2D 网格卡通滤镜，替换为基于摄像头实时帧的 3D 抽象场景渲染（类似特斯拉车机效果）。
>
> 技术路线：TensorFlow Lite 推理 → 场景理解 → Three.js 3D 渲染

---

## 目录

1. [改造范围](#1-改造范围)
2. [架构总览](#2-架构总览)
3. [新增依赖](#3-新增依赖)
4. [文件清单与职责](#4-文件清单与职责)
5. [详细实现](#5-详细实现)
   - [5.1 场景分析器](#51-场景分析器-sceneanalyzerts)
   - [5.2 3D 渲染器](#52-3d-渲染器-scenerendererts)
   - [5.3 3D 视图组件](#53-3d-视图组件-scene3dviewtsx)
   - [5.4 3D 场景管理 Hook](#54-3d-场景管理-hook-usescene3dts)
   - [5.5 Hook 导出与索引更新](#55-hook-导出与索引更新)
   - [5.6 下半屏替换为 3D 视图](#56-下半屏替换为-3d-视图)
   - [5.7 现有文件清理](#57-现有文件清理)
6. [数据流全景](#6-数据流全景)
7. [渲染效果参考](#7-渲染效果参考)
8. [性能预期](#8-性能预期)
9. [后续优化方向](#9-后续优化方向)

---

## 1. 改造范围

| 维度          | 内容                                                                                                |
| ------------- | --------------------------------------------------------------------------------------------------- |
| **新增文件**  | 5 个（`sceneAnalyzer.ts`、`sceneRenderer.ts`、`Scene3DView.tsx`、`useScene3D.ts`、`SceneTypes.ts`） |
| **修改文件**  | 4 个（`index.ts`、`camera.tsx`、`FilterPreview.tsx`、`package.json`）                               |
| **删除/废弃** | `frameProcessor.ts` 降级为辅助，不再作为下半屏主管线                                                |
| **新增依赖**  | `@tensorflow/tfjs`、`@tensorflow/tfjs-react-native`、`three`、`@react-three/fiber`、`expo-gl`       |
| **新增资源**  | COCO-SSD 模型（~12MB）                                                                              |

---

## 2. 架构总览

```
                                    ┌─────────────────────┐
                                    │   Camera (Vision)    │
                                    │   device + frame     │
                                    └────────┬────────────┘
                                             │ frame output
                                             ▼
┌──────────────────────────────────────────────────────────────┐
│                    useScene3D.ts (Hook)                       │
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌───────────────┐  │
│  │ Frame        │───▶│ sceneAnalyzer│───▶│ sceneRenderer │  │
│  │ 降采样/节流  │    │ .ts          │    │ .ts           │  │
│  │              │    │  TF 推理      │    │  场景构建      │  │
│  └──────────────┘    │  ↓           │    │  ↓             │  │
│                      │ SceneObject[]│    │ Scene3DData    │  │
│                      └──────────────┘    └───────┬────────┘  │
└──────────────────────────────────────────────────┼────────────┘
                                                   │ setSceneData
                                                   ▼
                              ┌──────────────────────────────────┐
                              │         Scene3DView.tsx           │
                              │  ┌────────────────────────────┐  │
                              │  │      Canvas (expo-gl)       │  │
                              │  │  ┌──────────────────────┐  │  │
                              │  │  │    Three.js Scene     │  │  │
                              │  │  │                      │  │  │
                              │  │  │  ┌────┐ ┌────┐     │  │  │
                              │  │  │  │车  │ │人  │ ...  │  │  │
                              │  │  │  └────┘ └────┘     │  │  │
                              │  │  │  ┌────────────────┐ │  │  │
                              │  │  │  │  地面网格       │ │  │  │
                              │  │  │  └────────────────┘ │  │  │
                              │  │  └──────────────────────┘  │  │
                              │  └────────────────────────────┘  │
                              └──────────────────────────────────┘
```

### 三阶段执行顺序

1. **骨架搭建**：安装依赖，新建类型文件和空壳组件，确保不报错
2. **推理接入**：`sceneAnalyzer.ts` 跑通 TF Lite，拿到 `SceneObject[]`
3. **3D 渲染**：`sceneRenderer.ts` + `Scene3DView.tsx` 把物体画出来

---

## 3. 新增依赖

```bash
# TensorFlow.js 推理引擎
npx expo install @tensorflow/tfjs @tensorflow/tfjs-react-native

# 3D 渲染
npx expo install three @react-three/fiber expo-gl

# TF 模型加载辅助
npx expo install expo-file-system
```

**模型文件**（手动下载，放入 `assets/models/`）：

- COCO-SSD Lite：`https://storage.googleapis.com/tfjs-models/savedmodel/ssd_mobilenet_v2_lite/saved_model_js/model.json`
- 约 12MB，放在 `assets/models/coco-ssd/` 下

---

## 4. 文件清单与职责

| #   | 文件路径                                         | 操作          | 职责                                            |
| --- | ------------------------------------------------ | ------------- | ----------------------------------------------- |
| 1   | `src/features/camera/types/SceneTypes.ts`        | **新建**      | 3D 场景类型定义                                 |
| 2   | `src/features/camera/services/sceneAnalyzer.ts`  | **新建**      | TF Lite 推理，输出场景物体列表                  |
| 3   | `src/features/camera/services/sceneRenderer.ts`  | **新建**      | 将 `SceneObject[]` 转成 Three.js 场景描述       |
| 4   | `src/features/camera/components/Scene3DView.tsx` | **新建**      | Three.js 画布渲染组件                           |
| 5   | `src/features/camera/hooks/useScene3D.ts`        | **新建**      | 帧 → 推理 → 渲染的完整 Hook                     |
| 6   | `src/features/camera/index.ts`                   | **修改**      | 导出新类型和新 Hook                             |
| 7   | `app/camera.tsx`                                 | **修改**      | 下半屏引用从 `FilterPreview` 换为 `Scene3DView` |
| 8   | `FilterPreview.tsx`                              | **保留/降级** | 作为备选保留，不再被主流程引用                  |
| 9   | `package.json`                                   | **修改**      | 新增依赖                                        |

---

## 5. 详细实现

### 5.1 场景类型 `types/SceneTypes.ts`

新建 `src/features/camera/types/SceneTypes.ts`：

```typescript
/** 物体在画面中的位置和大小（归一化坐标 0-1） */
export type BoundingBox = {
  x: number; // 中心 x
  y: number; // 中心 y
  width: number; // 宽度
  height: number; // 高度
};

/** 检测到的物体 */
export type SceneObject = {
  id: string;
  label: string; // 如 "person"、"car"、"dog"
  confidence: number; // 0-1
  box: BoundingBox;
  estimatedDepth: number; // 0（近）~ 1（远），用 box 纵坐标估算
};

/** 场景分析结果 */
export type SceneAnalysis = {
  objects: SceneObject[];
  timestamp: number;
};

/** 3D 场景描述（传给渲染器） */
export type Scene3DData = {
  objects: {
    id: string;
    label: string;
    /** 3D 世界坐标 x, y, z */
    position: { x: number; y: number; z: number };
    /** 物体尺寸（世界单位） */
    size: { width: number; height: number; depth: number };
    /** 抽象颜色 */
    color: string;
  }[];
  groundPlane: boolean;
};
```

### 5.2 场景分析器 `services/sceneAnalyzer.ts`

新建 `src/features/camera/services/sceneAnalyzer.ts`：

```typescript
import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-react-native";
import type { SceneAnalysis, SceneObject } from "../types/SceneTypes";

let model: tf.GraphModel | null = null;
let isInitializing = false;
let initPromise: Promise<void> | null = null;

/** COCO-SSD 标签映射（仅取跟交通/场景相关的类别） */
const KEEP_LABELS = new Set([
  "person",
  "car",
  "truck",
  "bus",
  "motorcycle",
  "bicycle",
  "dog",
  "cat",
  "traffic light",
  "stop sign",
  "fire hydrant",
  "bench",
  "chair",
  "couch",
  "bed",
  "dining table",
  "umbrella",
  "backpack",
  "handbag",
  "tie",
  "suitcase",
  "frisbee",
  "skis",
  "snowboard",
]);

let cachedAnalysis: SceneAnalysis = { objects: [], timestamp: 0 };

export async function initializeModel(): Promise<void> {
  if (model) return;
  if (initPromise) return initPromise;

  isInitializing = true;
  initPromise = (async () => {
    await tf.ready();
    model = await tf.loadGraphModel(
      tf.io.bundleResourceIO(
        require("../../../../assets/models/coco-ssd/model.json"),
      ),
    );
  })();

  try {
    await initPromise;
  } finally {
    isInitializing = false;
    initPromise = null;
  }
}

export function analyzeFrame(
  pixels: Uint8Array,
  width: number,
  height: number,
): SceneAnalysis {
  if (!model) return cachedAnalysis;

  try {
    // 降采样输入
    const input = tf.tidy(() => {
      const tensor = tf.tensor3d(pixels, [height, width, 4]);
      const resized = tf.image.resizeBilinear(tensor, [300, 300]);
      const expanded = resized.expandDims(0).toFloat();
      return expanded;
    });

    const result = model.execute(input) as tf.Tensor[];
    const boxes = result[0].dataSync() as Float32Array;
    const scores = result[1].dataSync() as Float32Array;
    const classes = result[2].dataSync() as Float32Array;
    const numDetections = result[3].dataSync() as Float32Array;

    const objects: SceneObject[] = [];
    const count = Math.min(numDetections[0], 10);

    for (let i = 0; i < count; i++) {
      if (scores[i] < 0.5) continue;

      const labelId = classes[i];
      const label = getLabel(labelId);
      if (!KEEP_LABELS.has(label)) continue;

      const [ymin, xmin, ymax, xmax] = [
        boxes[i * 4],
        boxes[i * 4 + 1],
        boxes[i * 4 + 2],
        boxes[i * 4 + 3],
      ];

      objects.push({
        id: `obj-${i}`,
        label,
        confidence: scores[i],
        box: {
          x: (xmin + xmax) / 2,
          y: (ymin + ymax) / 2,
          width: xmax - xmin,
          height: ymax - ymin,
        },
        // 粗略深度：画面下半部分的物体更近，上半部分更远
        estimatedDepth: 1 - (ymin + ymax) / 2,
      });
    }

    input.dispose();
    tf.dispose(result);

    cachedAnalysis = { objects, timestamp: Date.now() };
    return cachedAnalysis;
  } catch {
    return cachedAnalysis;
  }
}

function getLabel(classId: number): string {
  const LABELS = [
    "background",
    "person",
    "bicycle",
    "car",
    "motorcycle",
    "airplane",
    "bus",
    "train",
    "truck",
    "boat",
    "traffic light",
    "fire hydrant",
    "stop sign",
    "parking meter",
    "bench",
    "bird",
    "cat",
    "dog",
    "horse",
    "sheep",
    "cow",
    "elephant",
    "bear",
    "zebra",
    "giraffe",
    "backpack",
    "umbrella",
    "handbag",
    "tie",
    "suitcase",
    "frisbee",
    "skis",
    "snowboard",
    "sports ball",
    "kite",
    "baseball bat",
    "baseball glove",
    "skateboard",
    "surfboard",
    "tennis racket",
    "bottle",
    "wine glass",
    "cup",
    "fork",
    "knife",
    "spoon",
    "bowl",
    "banana",
    "apple",
    "sandwich",
    "orange",
    "broccoli",
    "carrot",
    "hot dog",
    "pizza",
    "donut",
    "cake",
    "chair",
    "couch",
    "potted plant",
    "bed",
    "dining table",
    "toilet",
    "tv",
    "laptop",
    "mouse",
    "remote",
    "keyboard",
    "cell phone",
    "microwave",
    "oven",
    "toaster",
    "sink",
    "refrigerator",
    "book",
    "clock",
    "vase",
    "scissors",
    "teddy bear",
    "hair drier",
    "toothbrush",
  ];

  const id = Math.round(classId);
  return id >= 0 && id < LABELS.length ? LABELS[id] : "unknown";
}
```

### 5.3 3D 渲染器 `services/sceneRenderer.ts`

新建 `src/features/camera/services/sceneRenderer.ts`：

```typescript
import type { Scene3DData, SceneObject } from "../types/SceneTypes";

/** 物体类别 → 抽象几何体颜色 */
const LABEL_COLORS: Record<string, string> = {
  person: "#ff6b6b",
  car: "#4ecdc4",
  truck: "#45b7d1",
  bus: "#f9ca24",
  motorcycle: "#e056fd",
  bicycle: "#7bed9f",
  dog: "#f8a5c2",
  cat: "#778beb",
  "traffic light": "#ffd32a",
  "stop sign": "#ff4757",
  bench: "#a4b0be",
  chair: "#dfe6e9",
  "dining table": "#b2bec3",
  bed: "#636e72",
  "potted plant": "#55efc4",
};

const DEFAULT_COLOR = "#74b9ff";

/** 物体类别 → 抽象几何体形状 */
export type ShapeType = "cylinder" | "box" | "sphere" | "capsule";

const LABEL_SHAPES: Record<string, ShapeType> = {
  person: "cylinder",
  car: "box",
  truck: "box",
  bus: "box",
  motorcycle: "box",
  bicycle: "box",
  dog: "sphere",
  cat: "sphere",
};

const DEFAULT_SHAPE: ShapeType = "box";

/** 将 SceneObject[] 映射为 Scene3DData */
export function buildScene3D(objects: SceneObject[]): Scene3DData {
  return {
    objects: objects.map((obj) => {
      // 将归一化坐标映射到 3D 世界坐标
      // x: -4 ~ 4 (左右)
      // z: -2 ~ 8 (远近)
      // y: 0.5 ~ 3 (高度)
      const worldX = (obj.box.x - 0.5) * 8;
      const worldZ = 2 + obj.box.y * 6;
      const worldY = 1; // 预设高度

      const baseSize = Math.min(obj.box.width, obj.box.height) * 4;
      const depthFromBox = obj.box.width * 3;

      return {
        id: obj.id,
        label: obj.label,
        position: { x: worldX, y: worldY, z: worldZ },
        size: {
          width: Math.max(0.3, baseSize),
          height: Math.max(0.5, baseSize * 1.5),
          depth: Math.max(0.3, depthFromBox),
        },
        color: LABEL_COLORS[obj.label] ?? DEFAULT_COLOR,
      };
    }),
    groundPlane: true,
  };
}

/** 获取物体对应的形状类型 */
export function getShapeType(label: string): ShapeType {
  return LABEL_SHAPES[label] ?? DEFAULT_SHAPE;
}

/** 获取抽象渲染透明度 */
export function getShapeOpacity(confidence: number): number {
  return 0.4 + confidence * 0.4; // 0.6 ~ 0.8
}
```

### 5.4 3D 视图组件 `components/Scene3DView.tsx`

新建 `src/features/camera/components/Scene3DView.tsx`：

```tsx
import { useState, useRef, useCallback } from "react";
import { StyleSheet, View } from "react-native";
import { Canvas, useFrame, useThree } from "@react-three/fiber/native";
import * as THREE from "three";
import type { Scene3DData, SceneObject } from "../types/SceneTypes";
import {
  buildScene3D,
  getShapeType,
  getShapeOpacity,
} from "../services/sceneRenderer";

type Scene3DViewProps = {
  objects: SceneObject[];
};

function AbstractObject({
  position,
  size,
  color,
  label,
  confidence,
}: {
  position: { x: number; y: number; z: number };
  size: { width: number; height: number; depth: number };
  color: string;
  label: string;
  confidence: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const shapeType = getShapeType(label);
  const opacity = getShapeOpacity(confidence);

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
        // 用拉伸球体模拟胶囊
        return <sphereGeometry args={[size.width / 2, 12, 8]} />;
      case "box":
      default:
        return <boxGeometry args={[size.width, size.height, size.depth]} />;
    }
  })();

  return (
    <mesh ref={meshRef} position={[position.x, position.y, position.z]}>
      {geometry}
      <meshStandardMaterial
        color={color}
        transparent
        opacity={opacity}
        wireframe={false}
        roughness={0.3}
        metalness={0.1}
      />
      {/* 线框轮廓 */}
      <lineSegments>
        <edgesGeometry
          args={[geometry.props as unknown as THREE.BufferGeometry]}
        />
        <lineBasicMaterial color={color} opacity={1} transparent={false} />
      </lineSegments>
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
    // 俯视 45° 视角，类似特斯拉的鸟瞰效果
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
          confidence={0.8}
        />
      ))}
    </>
  );
}

export function Scene3DView({ objects }: Scene3DViewProps) {
  if (objects.length === 0) {
    return (
      <View style={styles.empty}>
        <View style={styles.emptyState}>
          <View style={styles.scanningDot} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Canvas
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
});
```

### 5.5 3D 场景管理 Hook `hooks/useScene3D.ts`

新建 `src/features/camera/hooks/useScene3D.ts`：

```typescript
import { useState, useEffect, useRef, useCallback } from "react";
import type { SceneObject } from "../types/SceneTypes";
import { initializeModel, analyzeFrame } from "../services/sceneAnalyzer";
import type { FilterMode } from "../types";

type UseScene3DParams = {
  /** VisionCamera frame output 中的帧回调 */
  onFrame?: (frame: {
    width: number;
    height: number;
    pixels: Uint8Array;
  }) => void;
  filterMode: FilterMode;
};

export function useScene3D({ filterMode }: UseScene3DParams) {
  const [objects, setObjects] = useState<SceneObject[]>([]);
  const [isModelReady, setIsModelReady] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 初始化模型
  useEffect(() => {
    initializeModel()
      .then(() => setIsModelReady(true))
      .catch((err) => console.error("[useScene3D] model init failed:", err));
  }, []);

  // 外部暴露的处理帧函数（由 VisionCamera frame callback 调用）
  const processFrame = useCallback(
    (width: number, height: number, pixels: Uint8Array) => {
      if (!isModelReady) return;

      const result = analyzeFrame(pixels, width, height);
      setObjects(result.objects);
    },
    [isModelReady],
  );

  // 清理
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    objects,
    isModelReady,
    processFrame,
  };
}
```

### 5.6 Hook 导出与索引更新

修改 `src/features/camera/index.ts`，**追加以下导出**（注意不要覆盖已有的 `CartoonFrame` 等导出，当前这些仍然是 `FilterPreview` 需要的）：

```typescript
// 追加的内容：
export { useScene3D } from "./hooks/useScene3D";
export { Scene3DView } from "./components/Scene3DView";
export type {
  SceneObject,
  SceneAnalysis,
  Scene3DData,
  BoundingBox,
} from "./types/SceneTypes";
```

### 5.7 下半屏替换为 3D 视图

修改 `app/camera.tsx`，将下半屏的引用从 `FilterPreview` 切换为 `Scene3DView`。

**改动 1 — 导入替换**：

```diff
 import {
   CameraPreview,
-  FilterPreview,
   useCameraAccess,
   useCartoonCameraFeed,
+  useScene3D,
+  Scene3DView,
 } from "@/features/camera";
```

**改动 2 — 添加 `useScene3D` Hook 调用**：

```tsx
 const { cartoonFrame, device, frameOutput } = useCartoonCameraFeed({
   cameraFacing,
   filterMode,
 });

+const { objects, isModelReady, processFrame } = useScene3D({
+  filterMode,
+});
```

**改动 3 — 下半屏 View 替换**：

```diff
 <View style={styles.previewCard}>
-  <FilterPreview frame={cartoonFrame} />
+  <Scene3DView objects={objects} />
 </View>
```

---

## 6. 数据流全景

```
VisionCamera 帧 (60fps)
  │
  ├─▶ useCartoonCameraFeed (每帧, worklet 线程)
  │     └─▶ processFrame() → CartoonFrame (2D 网格，保留作为备选)
  │
  └─▶ useScene3D (每 ~200ms, JS 线程)
        ├─▶ analyzeFrame() → TF Lite 推理 → SceneObject[]
        └─▶ setObjects() → Scene3DView 重新渲染
              └─▶ buildScene3D() → Three.js 场景
```

**帧率分配**：

- 上半屏（真实摄像头）：60fps，VisionCamera 原生渲染
- 推理管线：3-5fps（每 200-300ms 一次，避免阻塞 UI）
- 3D 渲染：30fps（Three.js 独立循环，不受推理帧率限制）

---

## 7. 渲染效果参考

各 filterMode 下的 3D 表现差异：

| filterMode    | 3D 风格  | 物体外观                           |
| ------------- | -------- | ---------------------------------- |
| `original`    | 标准抽象 | 色块实心，半透明，有轮廓线         |
| `toon-soft`   | 柔和抽象 | 更透明的材质，圆润几何体，柔和光照 |
| `toon-strong` | 极简抽象 | 更低透明度，粗轮廓线，高对比色块   |

---

## 8. 性能预期

| 指标                 | 预期值                      |
| -------------------- | --------------------------- |
| 模型加载时间（首次） | 2-5s                        |
| 单帧推理时间         | 50-150ms（视手机而定）      |
| 推理间隔             | 200ms（5fps）               |
| 3D 渲染帧率          | 30fps                       |
| 额外包体积           | ~12-15MB（模型 + Three.js） |
| 额外内存             | ~50-80MB（推理时）          |

---

## 9. 后续优化方向

- [ ] INT8 量化模型（体积减 4x，速度提 2x）
- [ ] 深度估计（MiDaS TFLite），替代当前简易 box 深度
- [ ] 语义分割（DeepLab v3），区分道路/路面/天空
- [ ] 物体跟踪（跨帧 ID 稳定），避免物体闪烁跳变
- [ ] 动态相机（跟随画面中心物体旋转）
- [ ] 当前 `filterMode` 控制不同抽象风格

---

## 附录：目录结构变更前后对比

```
src/features/camera/
├── index.ts                       # 修改：追加 Scene3D 导出
├── types.ts                       # 不变
├── types/
│   └── SceneTypes.ts              # 新建：3D 场景类型
├── components/
│   ├── CameraPreview.tsx           # 不变
│   ├── FilterPreview.tsx           # 不变（降级为备选）
│   └── Scene3DView.tsx            # 新建：Three.js 画布
├── hooks/
│   ├── useCameraPermissions.ts    # 不变
│   ├── useCartoonCameraFeed.ts    # 不变
│   └── useScene3D.ts              # 新建：3D 场景 Hook
└── services/
    ├── frameProcessor.ts           # 不变（保留 2D 备选）
    ├── sceneAnalyzer.ts            # 新建：TF Lite 推理
    └── sceneRenderer.ts            # 新建：3D 场景构建
```
