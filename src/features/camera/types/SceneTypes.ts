/** 物体在画面中的位置和大小（归一化坐标 0-1） */
export type BoundingBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/** 检测到的物体 */
export type SceneObject = {
  id: string;
  label: string;
  confidence: number;
  box: BoundingBox;
  estimatedDepth: number;
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
    position: { x: number; y: number; z: number };
    size: { width: number; height: number; depth: number };
    color: string;
  }[];
  groundPlane: boolean;
};
