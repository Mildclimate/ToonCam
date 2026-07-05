import { useEffect } from "react";
import { Stack } from "expo-router";
import { initializeModel } from "@/features/camera/services/sceneAnalyzer";

export default function RootLayout() {
  useEffect(() => {
    initializeModel().catch((e) =>
      console.warn("[layout] TFLite preload failed:", e),
    );
  }, []);

  return <Stack screenOptions={{ headerShown: false }} />;
}
