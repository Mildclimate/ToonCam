import { Camera } from "react-native-vision-camera";
import { StyleSheet, Text, View } from "react-native";
import type {
  CameraDevice,
  CameraFrameOutput,
} from "react-native-vision-camera";

type CameraPreviewProps = {
  device: CameraDevice | undefined;
  frameOutput: CameraFrameOutput | undefined;
};

export function CameraPreview({ device, frameOutput }: CameraPreviewProps) {
  if (!device || !frameOutput) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingState}>
          <Text style={styles.loadingTitle}>Opening camera</Text>
          <Text style={styles.loadingSubtitle}>
            VisionCamera is selecting the best device for this preview.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive
        outputs={[frameOutput]}
      />
      <View style={styles.overlay}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>REAL</Text>
        </View>
        <Text style={styles.caption}>Live camera feed</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: "hidden",
    backgroundColor: "#111827",
  },
  loadingState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  loadingTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700",
  },
  loadingSubtitle: {
    marginTop: 8,
    color: "#cbd5e1",
    fontSize: 13,
    textAlign: "center",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "rgba(8, 15, 24, 0.14)",
  },
  badge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    backgroundColor: "rgba(15, 23, 42, 0.82)",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  badgeText: {
    color: "#f8fafc",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
  },
  caption: {
    alignSelf: "flex-start",
    borderRadius: 16,
    backgroundColor: "rgba(15, 23, 42, 0.78)",
    color: "#f8fafc",
    fontSize: 13,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
});
