import { useCallback, useRef } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Screen } from "@/components/ui/Screen";
import {
  CameraPreview,
  Scene3DView,
  useCameraAccess,
  useCameraFeed,
  useScene3D,
} from "@/features/camera";
import { useAppStore } from "@/store/useAppStore";

export default function CameraScreen() {
  const { permission, requestPermission } = useCameraAccess();
  const cameraFacing = useAppStore((state) => state.cameraFacing);
  const setCameraFacing = useAppStore((state) => state.setCameraFacing);

  const { objects, modelStatus, processFrame } = useScene3D();

  const processFrameRef = useRef(processFrame);
  processFrameRef.current = processFrame;

  const handleFrameForScene = useCallback(
    (w: number, h: number, p: number[]) => {
      processFrameRef.current(w, h, new Uint8Array(p));
    },
    [],
  );

  const { device, frameOutput } = useCameraFeed({
    cameraFacing,
    onFrameForScene: handleFrameForScene,
  });

  // 权限查询中
  if (permission.granted === null) {
    return (
      <Screen>
        <View style={styles.permissionContainer}>
          <ActivityIndicator size="large" color="#77aaff" />
          <Text style={styles.loadingText}>Checking camera access...</Text>
        </View>
      </Screen>
    );
  }

  // 权限未授权
  if (!permission.granted) {
    return (
      <Screen>
        <View style={styles.permissionContainer}>
          <View style={styles.permissionCard}>
            <Text style={styles.permissionTitle}>
              Camera permission required
            </Text>
            <Text style={styles.permissionSubtitle}>
              打开摄像头权限后，才能进入上下分屏的 camera flow。需要 development
              build。
            </Text>
            <Pressable
              style={styles.permissionButton}
              onPress={requestPermission}
            >
              <Text style={styles.permissionButtonText}>Grant permission</Text>
            </Pressable>
          </View>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>Camera + Detection</Text>
            <Text style={styles.subtitle}>
              上半原生摄像头，下半 3D 物体检测。需要 development build。
            </Text>
          </View>

          <Pressable
            style={styles.flipButton}
            onPress={() =>
              setCameraFacing(cameraFacing === "back" ? "front" : "back")
            }
          >
            <Text style={styles.flipButtonText}>Flip</Text>
          </Pressable>
        </View>

        <View style={styles.previewStack}>
          <View style={styles.previewCard}>
            <CameraPreview device={device} frameOutput={frameOutput} />
          </View>
          <View style={styles.previewCard}>
            <Scene3DView objects={objects} status={modelStatus} />
          </View>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    gap: 12,
  },
  permissionContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  permissionCard: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.18)",
    backgroundColor: "rgba(17, 24, 39, 0.94)",
    padding: 20,
  },
  permissionTitle: {
    color: "#ffffff",
    fontSize: 24,
    fontWeight: "700",
  },
  permissionSubtitle: {
    marginTop: 10,
    color: "#cbd5e1",
    fontSize: 15,
    lineHeight: 22,
  },
  permissionButton: {
    alignSelf: "flex-start",
    marginTop: 16,
    borderRadius: 999,
    backgroundColor: "#77aaff",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  permissionButtonText: {
    color: "#0b0f14",
    fontWeight: "700",
  },
  loadingText: {
    marginTop: 16,
    color: "#94a3b8",
    fontSize: 14,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  headerLeft: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "700",
  },
  subtitle: {
    marginTop: 4,
    color: "#94a3b8",
    fontSize: 13,
    lineHeight: 18,
  },
  flipButton: {
    borderRadius: 999,
    backgroundColor: "rgba(119, 170, 255, 0.18)",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  flipButtonText: {
    color: "#77aaff",
    fontWeight: "700",
  },
  previewStack: {
    flex: 1,
    gap: 8,
  },
  previewCard: {
    flex: 1,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.15)",
  },
});
