import { useState, useEffect, useCallback, useRef } from "react";
import type { SceneObject } from "../types/SceneTypes";
import { initializeModel, analyzeFrame } from "../services/sceneAnalyzer";

type ModelStatus = "loading" | "ready";

/** 管理 COCO-SSD 模型生命周期 + 定时推理 */
export function useScene3D() {
  const [objects, setObjects] = useState<SceneObject[]>([]);
  const [modelStatus, setModelStatus] = useState<ModelStatus>("loading");

  const latestFrameRef = useRef<{
    w: number;
    h: number;
    p: Uint8Array;
  } | null>(null);
  const crashGuardRef = useRef(false);

  // ── 模型初始化 ──
  useEffect(() => {
    let cancelled = false;

    initializeModel()
      .then(() => {
        if (!cancelled) setModelStatus("ready");
      })
      .catch((e) => {
        console.error("[useScene3D] model init failed:", e);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // ── 推理定时器（每 1.5s） ──
  useEffect(() => {
    if (modelStatus !== "ready") return;

    const timer = setInterval(() => {
      if (crashGuardRef.current) return;
      const frame = latestFrameRef.current;
      if (!frame) return;

      crashGuardRef.current = true;
      try {
        const pixelsCopy = new Uint8Array(frame.p.buffer.slice(0));
        const result = analyzeFrame(pixelsCopy, frame.w, frame.h);
        setObjects(result.objects);
      } catch (e) {
        console.error("[useScene3D] inference error:", e);
      } finally {
        crashGuardRef.current = false;
      }
    }, 1500);

    return () => clearInterval(timer);
  }, [modelStatus]);

  // ── worklet 回调：接收原始帧 ──
  const processFrame = useCallback(
    (width: number, height: number, pixels: Uint8Array) => {
      latestFrameRef.current = { w: width, h: height, p: pixels };
    },
    [],
  );

  return { objects, modelStatus, processFrame };
}
