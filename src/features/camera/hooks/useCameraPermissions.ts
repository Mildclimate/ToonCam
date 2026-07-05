import { useCameraPermission } from "react-native-vision-camera";

export type CameraAccessState = {
  /** true=已授权, false=已拒绝, null=加载中 */
  granted: boolean | null;
};

export function useCameraAccess() {
  const { hasPermission, requestPermission } = useCameraPermission();

  return {
    permission: {
      // hasPermission: true=已授权, false=已拒绝, null=仍在查询中
      granted: hasPermission,
    } as CameraAccessState,
    requestPermission,
    isReady: hasPermission === true,
  };
}
