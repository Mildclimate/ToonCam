import { useState, useEffect, useCallback, useRef } from "react";
import type { SceneObject } from "../types/SceneTypes";
import {
  initializeModel,
  analyzeFrame,
  isModelReady,
} from "../services/sceneAnalyzer";

type UseScene3DParams = {
  filterMode: string;
};

type ModelStatus = "loading" | "ready";

// 传入一个string表示滤镜模式，返回一个对象包含场景物体列表、模型状态和帧处理函数
export function useScene3D(_params: UseScene3DParams) {
  const [objects, setObjects] = useState<SceneObject[]>([]);
  const [modelStatus, setModelStatus] = useState<ModelStatus>("loading");

  // worklet → JS 帧缓冲，独立定时器消费，彻底解耦
  const latestFrameRef = useRef<{
    w: number;
    h: number;
    p: Uint8Array;
  } | null>(null);
  const crashGuardRef = useRef(false);

  // ── 模型初始化（挂载时调用一次） ──
  useEffect(() => {
    let cancelled = false;

    initializeModel()
      .then(() => {
        if (!cancelled) {
          console.log("[useScene3D] model ready, starting inference");
          setModelStatus("ready");
        }
      })
      .catch((e) => {
        console.error("[useScene3D] model init failed:", e);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // ── 推理定时器（模型就绪后，每 1.5s 跑一次） ──
  useEffect(() => {
    if (modelStatus !== "ready") return;

    let tickCount = 0;
    const timer = setInterval(() => {
      tickCount++;
      if (crashGuardRef.current) return;
      const frame = latestFrameRef.current;
      console.log("[useScene3D] tick", tickCount, "frame:", frame?.w, frame?.h);

      if (!frame) {
        if (tickCount <= 2) {
          console.log(
            "[useScene3D] waiting for frame... (tick",
            tickCount,
            ")",
          );
        }
        return;
      }

      crashGuardRef.current = true;
      try {
        const pixelsCopy = new Uint8Array(frame.p.buffer.slice(0));
        console.log(
          `[useScene3D] running inference on ${frame.w}x${frame.h} frame`,
        );
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

  // ── worklet 回调：只存帧引用 ──
  const processFrame = useCallback(
    (width: number, height: number, pixels: Uint8Array) => {
      console.log(`[useScene3D] frame received: ${width}x${height}`);
      latestFrameRef.current = { w: width, h: height, p: pixels };
    },
    [],
  );

  return {
    objects,
    modelStatus,
    processFrame,
  };
}
