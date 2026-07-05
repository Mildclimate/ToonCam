import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-react-native";
import { Asset } from "expo-asset";
import * as FileSystem from "expo-file-system/legacy";
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
]);

// ── 模型实例 ──
let model: tf.GraphModel | null = null;
let loadPromise: Promise<void> | null = null;

// ── 模型 JSON（Metro 对 .json 的 require() 直接返回解析对象，稳定可靠） ──
const modelJson = require("../../../../assets/models/coco-ssd/model.json");

// ── 打包的权重文件 module ID ──
const weightModules: number[] = [
  require("../../../../assets/models/coco-ssd/group1-shard1of17.bin"),
  require("../../../../assets/models/coco-ssd/group1-shard2of17.bin"),
  require("../../../../assets/models/coco-ssd/group1-shard3of17.bin"),
  require("../../../../assets/models/coco-ssd/group1-shard4of17.bin"),
  require("../../../../assets/models/coco-ssd/group1-shard5of17.bin"),
  require("../../../../assets/models/coco-ssd/group1-shard6of17.bin"),
  require("../../../../assets/models/coco-ssd/group1-shard7of17.bin"),
  require("../../../../assets/models/coco-ssd/group1-shard8of17.bin"),
  require("../../../../assets/models/coco-ssd/group1-shard9of17.bin"),
  require("../../../../assets/models/coco-ssd/group1-shard10of17.bin"),
  require("../../../../assets/models/coco-ssd/group1-shard11of17.bin"),
  require("../../../../assets/models/coco-ssd/group1-shard12of17.bin"),
  require("../../../../assets/models/coco-ssd/group1-shard13of17.bin"),
  require("../../../../assets/models/coco-ssd/group1-shard14of17.bin"),
  require("../../../../assets/models/coco-ssd/group1-shard15of17.bin"),
  require("../../../../assets/models/coco-ssd/group1-shard16of17.bin"),
  require("../../../../assets/models/coco-ssd/group1-shard17of17.bin"),
];

/** 将模型文件从 bundle 复制到内存，用自定义 IO handler 直接注入权重（绕开 file:// 协议） */
async function loadModelFromBundle(): Promise<tf.GraphModel> {
  const weightPaths = modelJson.weightsManifest[0].paths;
  const weightDataChunks: ArrayBuffer[] = [];

  for (let i = 0; i < weightPaths.length; i++) {
    const asset = Asset.fromModule(weightModules[i]);
    await asset.downloadAsync();

    // 读取权重文件为 base64，再解码为 ArrayBuffer
    const base64 = await FileSystem.readAsStringAsync(asset.localUri!, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const binaryStr = atob(base64);
    const buf = new ArrayBuffer(binaryStr.length);
    const view = new Uint8Array(buf);
    for (let j = 0; j < binaryStr.length; j++) {
      view[j] = binaryStr.charCodeAt(j);
    }
    weightDataChunks.push(buf);
  }

  // 拼接所有权重为一个连续 ArrayBuffer
  const totalLength = weightDataChunks.reduce((s, c) => s + c.byteLength, 0);
  const weightData = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of weightDataChunks) {
    weightData.set(new Uint8Array(chunk), offset);
    offset += chunk.byteLength;
  }

  console.log(
    "[sceneAnalyzer] model weights loaded into memory, building IO handler",
  );

  // 自定义 IO handler：直接注入 modelTopology + weightSpecs + weightData
  const handler: tf.io.IOHandler = {
    load: async () => {
      const modelTopology = modelJson.modelTopology;
      const weightSpecs = modelJson.weightsManifest[0].weights;
      return {
        modelTopology,
        weightSpecs,
        weightData: weightData.buffer,
      };
    },
  };

  return tf.loadGraphModel(handler);
}

let cachedAnalysis: SceneAnalysis = { objects: [], timestamp: 0 };

// ═══════════════════════════════════════════════════════════════
// 公开 API
// ═══════════════════════════════════════════════════════════════

export async function initializeModel(): Promise<void> {
  if (model) return;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    console.log("[sceneAnalyzer] tf.ready()...");
    await tf.ready();

    // ✅ 强制 CPU 后端，避免与 Three.js 抢夺 GL 上下文
    await tf.setBackend("cpu");
    console.log("[sceneAnalyzer] backend:", tf.getBackend());

    console.log("[sceneAnalyzer] loading COCO-SSD from bundle...");
    model = await loadModelFromBundle();
    console.log("[sceneAnalyzer] ✅ model loaded");
  })();

  try {
    await loadPromise;
  } catch (e) {
    console.error("[sceneAnalyzer] ❌ model load failed:", e);
    loadPromise = null;
    throw e;
  }
}

export function isModelReady(): boolean {
  return model !== null;
}

export function isModelLoaded(): boolean {
  return model !== null;
}

export function analyzeFrame(
  pixels: Uint8Array,
  width: number,
  height: number,
): SceneAnalysis {
  if (!model) return cachedAnalysis;

  return tf.tidy(() => {
    try {
      const t0 = Date.now();

      // 1. Uint8Array → Int32Array（匹配 int32 dtype 的字节宽度）
      const int32Data = new Int32Array(pixels.length);
      int32Data.set(pixels);
      const tensor = tf.tensor3d(int32Data, [height, width, 3], "int32");

      // 2. 转 float32 后缩放到 300×300（resizeBilinear 需要 float）
      const floatTensor = tensor.toFloat();
      const resized = tf.image.resizeBilinear(floatTensor, [300, 300]);

      // 3. batch 维度 → [1, 300, 300, 3]
      const batched = resized.expandDims(0);

      // 4. 推理
      const result = model!.execute(batched) as tf.Tensor[];
      const t1 = Date.now();

      // 5. 解析: boxes, scores, classes, numDetections
      const boxes = result[0].dataSync() as Float32Array;
      const scores = result[1].dataSync() as Float32Array;
      const classes = result[2].dataSync() as Float32Array;
      const numDetections = result[3].dataSync() as Float32Array;

      const count = Math.min(numDetections[0], 10);
      const objects: SceneObject[] = [];

      for (let i = 0; i < count; i++) {
        const score = scores[i];
        if (score < 0.45) continue;

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

      // 不手动 dispose — tf.tidy() 会在 return 时自动清理所有中间 tensor

      console.log(
        `[sceneAnalyzer] inference ${t1 - t0}ms, ${objects.length} objects (top score: ${scores[0]?.toFixed(2) ?? "N/A"})`,
      );

      cachedAnalysis = { objects, timestamp: Date.now() };
      return cachedAnalysis;
    } catch (err) {
      console.warn("[sceneAnalyzer] inference error:", err);
      return cachedAnalysis;
    }
  });
}
