import { create } from "zustand";
import type { CameraFacing } from "../features/camera/types";

type AppState = {
  cameraFacing: CameraFacing;
  setCameraFacing: (facing: CameraFacing) => void;
};

export const useAppStore = create<AppState>((set) => ({
  cameraFacing: "back",
  setCameraFacing: (cameraFacing) => set({ cameraFacing }),
}));
