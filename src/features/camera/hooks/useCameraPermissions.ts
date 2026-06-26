import { useCameraPermission } from "react-native-vision-camera";

export function useCameraAccess() {
  const { hasPermission, requestPermission } = useCameraPermission();

  return {
    permission: {
      granted: hasPermission,
    },
    requestPermission,
    isReady: hasPermission,
  };
}
