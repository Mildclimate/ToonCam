import { StyleSheet, Text, View } from "react-native";

export function FilterPreview() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Filter preview placeholder</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0f172a",
  },
  text: {
    color: "#ffffff",
  },
});
