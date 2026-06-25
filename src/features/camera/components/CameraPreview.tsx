import { StyleSheet, Text, View } from "react-native";

export function CameraPreview() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Camera preview placeholder</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111827",
  },
  text: {
    color: "#ffffff",
  },
});
