import { useCameraDevice, useFrameOutput } from "react-native-vision-camera";
import { runOnJS } from "react-native-worklets";
import type { CameraFacing } from "../types";

type UseCameraFeedParams = {
  cameraFacing: CameraFacing;
  onFrameForScene?: (width: number, height: number, pixels: number[]) => void;
};

/** 在 worklet 中用 2×2 平均采样缩放到目标尺寸（比最近邻平滑很多） */
function fastResize(
  src: Uint8Array,
  srcW: number,
  srcH: number,
  dstW: number,
  dstH: number,
): Uint8Array {
  "worklet";

  const dst = new Uint8Array(dstW * dstH * 3);
  const xRatio = srcW / dstW;
  const yRatio = srcH / dstH;
  for (let y = 0; y < dstH; y++) {
    for (let x = 0; x < dstW; x++) {
      // 2×2 区域平均采样
      const cx = x * xRatio;
      const cy = y * yRatio;
      const x1 = Math.min(Math.floor(cx), srcW - 1);
      const y1 = Math.min(Math.floor(cy), srcH - 1);
      const x2 = Math.min(x1 + 1, srcW - 1);
      const y2 = Math.min(y1 + 1, srcH - 1);
      const di = (y * dstW + x) * 3;
      for (let c = 0; c < 3; c++) {
        dst[di + c] =
          (src[(y1 * srcW + x1) * 3 + c] +
            src[(y1 * srcW + x2) * 3 + c] +
            src[(y2 * srcW + x1) * 3 + c] +
            src[(y2 * srcW + x2) * 3 + c]) >>>
          2;
      }
    }
  }
  return dst;
}

const TARGET_SIZE = 300;

/** 获取原生摄像头帧，缩小后传给模型推理 */
export function useCameraFeed({
  cameraFacing,
  onFrameForScene,
}: UseCameraFeedParams) {
  const device = useCameraDevice(cameraFacing);

  const frameOutput = useFrameOutput({
    pixelFormat: "rgb",
    allowDeferredStart: false,
    dropFramesWhileBusy: true,
    onFrame(frame) {
      "worklet";

      const rawBuf = frame.getPixelBuffer();
      if (!rawBuf || !onFrameForScene) return;

      const pixels = new Uint8Array(rawBuf.byteLength);
      pixels.set(new Uint8Array(rawBuf));

      // worklet bridge 对 Uint8Array 序列化有问题，改用普通数组传输
      const resized = fastResize(
        pixels,
        frame.width,
        frame.height,
        TARGET_SIZE,
        TARGET_SIZE,
      );
      const plain = Array.from(resized);

      runOnJS(onFrameForScene)(TARGET_SIZE, TARGET_SIZE, plain);
      frame.dispose();
    },
  });

  return { device, frameOutput };
}
