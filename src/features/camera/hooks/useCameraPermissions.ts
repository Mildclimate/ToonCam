import { useCameraPermissions } from "expo-camera";

export function useCameraAccess() {
  const [permission, requestPermission] = useCameraPermissions();

  return {
    permission,
    requestPermission,
    isReady: Boolean(permission?.granted),
  };
}
