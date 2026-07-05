import type { Scene3DData, SceneObject } from "../types/SceneTypes";

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
};

const DEFAULT_COLOR = "#74b9ff";

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

export function buildScene3D(objects: SceneObject[]): Scene3DData {
  return {
    objects: objects.map((obj) => {
      const worldX = (obj.box.x - 0.5) * 8;
      const worldZ = 2 + obj.box.y * 6;
      const worldY = 1;

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

export function getShapeType(label: string): ShapeType {
  return LABEL_SHAPES[label] ?? DEFAULT_SHAPE;
}

export function getShapeOpacity(_confidence: number): number {
  return 0.6;
}
