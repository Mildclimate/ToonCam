import { Link } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>ToonCam</Text>
      <Text style={styles.subtitle}>
        Real-time cartoon camera starter shell
      </Text>
      <Link href="/camera" style={styles.link}>
        Open camera flow
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#0b0f14",
  },
  title: {
    color: "#ffffff",
    fontSize: 36,
    fontWeight: "700",
  },
  subtitle: {
    marginTop: 12,
    color: "#9aa4b2",
    fontSize: 16,
    textAlign: "center",
  },
  link: {
    marginTop: 24,
    color: "#77aaff",
    fontSize: 16,
  },
});
