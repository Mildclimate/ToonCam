import type { PropsWithChildren } from "react";
import { SafeAreaView, StyleSheet, View } from "react-native";

export function Screen({ children }: PropsWithChildren) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0b0f14",
  },
  container: {
    flex: 1,
  },
});
