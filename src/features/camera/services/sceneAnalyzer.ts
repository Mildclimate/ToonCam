import { loadTensorflowModel } from "react-native-fast-tflite";
import type { TfliteModel } from "react-native-fast-tflite";
import type { SceneAnalysis, SceneObject } from "../types/SceneTypes";

// ── COCO-SSD 标签（1-based，下标 0 为 background） ──
const COCO_LABELS = [
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

/** 只保留场景/交通相关类别 */
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
  "bench",
  "chair",
  "couch",
  "bed",
  "dining table",
  "potted plant",
  "backpack",
  "handbag",
  "suitcase",
  "umbrella",
  "frisbee",
  "skis",
  "snowboard",
  "sports ball",
  "kite",
  "skateboard",
  "surfboard",
  "tennis racket",
  "baseball bat",
  "baseball glove",
  "tv",
]);

// ── 模型实例 ──
let model: TfliteModel | null = null;
let loadPromise: Promise<void> | null = null;

/** 双线性插值缩小/放大 */
function resizeBilinear(
  src: Uint8Array,
  srcW: number,
  srcH: number,
  dstW: number,
  dstH: number,
): Uint8Array {
  const dst = new Uint8Array(dstW * dstH * 3);
  const xRatio = srcW / dstW;
  const yRatio = srcH / dstH;
  for (let y = 0; y < dstH; y++) {
    for (let x = 0; x < dstW; x++) {
      const sx = x * xRatio;
      const sy = y * yRatio;
      const x1 = Math.floor(sx);
      const y1 = Math.floor(sy);
      const x2 = Math.min(x1 + 1, srcW - 1);
      const y2 = Math.min(y1 + 1, srcH - 1);
      const dx = sx - x1;
      const dy = sy - y1;
      for (let c = 0; c < 3; c++) {
        const v =
          (1 - dx) * (1 - dy) * src[(y1 * srcW + x1) * 3 + c] +
          dx * (1 - dy) * src[(y1 * srcW + x2) * 3 + c] +
          (1 - dx) * dy * src[(y2 * srcW + x1) * 3 + c] +
          dx * dy * src[(y2 * srcW + x2) * 3 + c];
        dst[(y * dstW + x) * 3 + c] = Math.round(v);
      }
    }
  }
  return dst;
}

let cachedAnalysis: SceneAnalysis = { objects: [], timestamp: 0 };

// ═══════════════════════════════════════════════════════════════
// 公开 API
// ═══════════════════════════════════════════════════════════════

export async function initializeModel(): Promise<void> {
  if (model) return;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    console.log("[sceneAnalyzer] loading TFLite COCO-SSD...");
    const m = await loadTensorflowModel(
      require("../../../../assets/models/coco_ssd_mobilenet_v1_1.0_quant.tflite"),
      [],
    );
    console.log(
      "[sceneAnalyzer] ✅ TFLite model loaded:",
      JSON.stringify({
        inputs: m.inputs.map((t) => ({
          name: t.name,
          shape: t.shape,
          dtype: t.dataType,
        })),
        outputs: m.outputs.map((t) => ({
          name: t.name,
          shape: t.shape,
          dtype: t.dataType,
        })),
      }),
    );
    model = m;
  })();

  await loadPromise;
}

export function isModelReady(): boolean {
  return model !== null;
}

export async function analyzeFrame(
  pixels: Uint8Array,
  width: number,
  height: number,
): Promise<SceneAnalysis> {
  if (!model) return cachedAnalysis;

  try {
    const t0 = Date.now();

    // 1. 縮放到 300×300（模型输入尺寸）
    const resized = resizeBilinear(pixels, width, height, 300, 300);

    // 2. TFLite 推理
    const outputs = await model.run([resized.buffer as ArrayBuffer]);
    const t1 = Date.now();

    // 3. 解析输出（注意输出顺序是 boxes → classes → scores → num）
    const boxes = new Float32Array(outputs[0]);
    const classes = new Float32Array(outputs[1]);
    const scores = new Float32Array(outputs[2]);
    const numDetections = new Float32Array(outputs[3]);

    const count = Math.min(Math.round(numDetections[0]), 20);
    const objects: SceneObject[] = [];

    for (let i = 0; i < count; i++) {
      const score = scores[i];
      if (score < 0.04) continue;

      const classId = Math.round(classes[i]);
      const label = COCO_LABELS[classId] ?? "unknown";
      if (!KEEP_LABELS.has(label)) continue;

      const off = i * 4;
      const ymin = boxes[off];
      const xmin = boxes[off + 1];
      const ymax = boxes[off + 2];
      const xmax = boxes[off + 3];

      objects.push({
        id: `obj-${i}`,
        label,
        confidence: score,
        box: {
          x: (xmin + xmax) / 2,
          y: (ymin + ymax) / 2,
          width: Math.max(0, xmax - xmin),
          height: Math.max(0, ymax - ymin),
        },
        estimatedDepth: 1 - (ymin + ymax) / 2,
      });
    }

    console.log(
      `[sceneAnalyzer] TFLite ${t1 - t0}ms, ${objects.length} objects (top: ${scores[0]?.toFixed(2) ?? "N/A"})`,
    );

    cachedAnalysis = { objects, timestamp: Date.now() };
    return cachedAnalysis;
  } catch (err) {
    console.warn("[sceneAnalyzer] inference error:", err);
    return cachedAnalysis;
  }
}

export function isModelLoaded(): boolean {
  return model !== null;
}
