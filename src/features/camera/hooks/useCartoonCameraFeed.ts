import { useState } from "react";
import { useCameraDevice, useFrameOutput } from "react-native-vision-camera";
import { runOnJS } from "react-native-worklets";
import { processFrame, type CartoonFrame } from "../services/frameProcessor";
import type { CameraFacing, FilterMode } from "../types";

type UseCartoonCameraFeedParams = {
  cameraFacing: CameraFacing;
  filterMode: FilterMode;
  onFrameForScene?: (width: number, height: number, pixels: Uint8Array) => void;
};

/** worklet 线程安全的帧计数器，替代 Date.now() */
let frameCounter = 0;

export function useCartoonCameraFeed({
  cameraFacing,
  filterMode,
  onFrameForScene,
}: UseCartoonCameraFeedParams) {
  const device = useCameraDevice(cameraFacing);
  const [cartoonFrame, setCartoonFrame] = useState<CartoonFrame | null>(null);

  const frameOutput = useFrameOutput({
    pixelFormat: "rgb",
    onFrame(frame) {
      "worklet";

      try {
        frameCounter += 1;
        if (frameCounter % 3 !== 0) {
          return;
        }

        // ✅ 深拷贝：立即复制像素数据，与 frame 生命周期解耦
        const rawBuf = frame.getPixelBuffer();
        const pixels = new Uint8Array(rawBuf.byteLength);
        pixels.set(new Uint8Array(rawBuf));

        // 现在 pixels 是独立拷贝，可以安全传给 JS 线程
        if (onFrameForScene) {
          runOnJS(onFrameForScene)(frame.width, frame.height, pixels);
        }

        const cartoon = processFrame({
          width: frame.width,
          height: frame.height,
          pixels,
          filterMode,
        });

        runOnJS(setCartoonFrame)(cartoon);
      } finally {
        frame.dispose();
      }
    },
  });

  return {
    cartoonFrame,
    device,
    frameOutput,
  };
}
