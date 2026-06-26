import { useState } from "react";
import { useCameraDevice, useFrameOutput } from "react-native-vision-camera";
import { runOnJS } from "react-native-worklets";
import { processFrame, type CartoonFrame } from "../services/frameProcessor";
import type { CameraFacing, FilterMode } from "../types";

type UseCartoonCameraFeedParams = {
  cameraFacing: CameraFacing;
  filterMode: FilterMode;
};

let lastFrameAt = 0;

export function useCartoonCameraFeed({
  cameraFacing,
  filterMode,
}: UseCartoonCameraFeedParams) {
  const device = useCameraDevice(cameraFacing);
  const [cartoonFrame, setCartoonFrame] = useState<CartoonFrame | null>(null);

  const frameOutput = useFrameOutput({
    pixelFormat: "rgb",
    onFrame(frame) {
      "worklet";

      try {
        const now = Date.now();

        if (now - lastFrameAt < 110) {
          return;
        }

        lastFrameAt = now;

        const cartoon = processFrame({
          width: frame.width,
          height: frame.height,
          pixels: new Uint8Array(frame.getPixelBuffer()),
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
