import { useCameraDevice, useFrameOutput } from "react-native-vision-camera";
import { runOnJS } from "react-native-worklets";
import type { CameraFacing } from "../types";

type UseCameraFeedParams = {
  cameraFacing: CameraFacing;
  onFrameForScene?: (width: number, height: number, pixels: Uint8Array) => void;
};

/** worklet 线程安全的帧计数器 */
let frameCounter = 0;

/** 获取原生摄像头帧，直接交给模型推理 */
export function useCameraFeed({
  cameraFacing,
  onFrameForScene,
}: UseCameraFeedParams) {
  const device = useCameraDevice(cameraFacing);

  const frameOutput = useFrameOutput({
    pixelFormat: "rgb",
    onFrame(frame) {
      "worklet";

      try {
        frameCounter += 1;
        if (frameCounter % 3 !== 0) return;

        const rawBuf = frame.getPixelBuffer();
        const pixels = new Uint8Array(rawBuf.byteLength);
        pixels.set(new Uint8Array(rawBuf));

        if (onFrameForScene) {
          runOnJS(onFrameForScene)(frame.width, frame.height, pixels);
        }
      } finally {
        frame.dispose();
      }
    },
  });

  return { device, frameOutput };
}
