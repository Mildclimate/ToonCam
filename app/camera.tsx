import { Pressable, StyleSheet, Text, View } from "react-native";
import { Screen } from "@/components/ui/Screen";
import {
  CameraPreview,
  FilterPreview,
  useCameraAccess,
  useCartoonCameraFeed,
} from "@/features/camera";
import { useAppStore } from "@/store/useAppStore";

const FILTER_OPTIONS = [
  { label: "Original", value: "original" as const },
  { label: "Soft Toon", value: "toon-soft" as const },
  { label: "Strong Toon", value: "toon-strong" as const },
];

export default function CameraScreen() {
  const { permission, requestPermission } = useCameraAccess();
  const cameraFacing = useAppStore((state) => state.cameraFacing);
  const filterMode = useAppStore((state) => state.filterMode);
  const setCameraFacing = useAppStore((state) => state.setCameraFacing);
  const setFilterMode = useAppStore((state) => state.setFilterMode);
  const { cartoonFrame, device, frameOutput } = useCartoonCameraFeed({
    cameraFacing,
    filterMode,
  });

  if (!permission?.granted) {
    return (
      <Screen>
        <View style={styles.permissionContainer}>
          <View style={styles.permissionCard}>
            <Text style={styles.permissionTitle}>
              Camera permission required
            </Text>
            <Text style={styles.permissionSubtitle}>
              打开摄像头权限后，才能进入上下分屏的 camera flow。这个页面需要
              development build，不支持 Expo Go。
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
          <View>
            <Text style={styles.title}>Camera Flow</Text>
            <Text style={styles.subtitle}>
              上半是真实摄像头，下半是实时卡通渲染位。需要 development build。
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
            <FilterPreview frame={cartoonFrame} />
          </View>
        </View>

        <View style={styles.toolbar}>
          {FILTER_OPTIONS.map((option) => {
            const isActive = option.value === filterMode;

            return (
              <Pressable
                key={option.value}
                style={[styles.modeChip, isActive && styles.modeChipActive]}
                onPress={() => setFilterMode(option.value)}
              >
                <Text
                  style={[
                    styles.modeChipText,
                    isActive && styles.modeChipTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
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
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  title: {
    color: "#ffffff",
    fontSize: 30,
    fontWeight: "700",
  },
  subtitle: {
    marginTop: 12,
    color: "#cbd5e1",
    fontSize: 14,
  },
  flipButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.16)",
    backgroundColor: "rgba(17, 24, 39, 0.9)",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  flipButtonText: {
    color: "#ffffff",
    fontWeight: "600",
  },
  previewStack: {
    flex: 1,
    gap: 12,
  },
  previewCard: {
    flex: 1,
    minHeight: 180,
    borderRadius: 28,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.16)",
    backgroundColor: "#111827",
  },
  toolbar: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
  },
  modeChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.2)",
    backgroundColor: "rgba(15, 23, 42, 0.82)",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  modeChipActive: {
    borderColor: "#77aaff",
    backgroundColor: "rgba(119, 170, 255, 0.18)",
  },
  modeChipText: {
    color: "#cbd5e1",
    fontSize: 13,
    fontWeight: "600",
  },
  modeChipTextActive: {
    color: "#ffffff",
  },
});
