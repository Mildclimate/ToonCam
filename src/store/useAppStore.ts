import { create } from "zustand";
import type { CameraFacing } from "../features/camera/types";
import type { FilterMode } from "../features/camera/types";

type AppState = {
  cameraFacing: CameraFacing;
  filterMode: FilterMode;
  setCameraFacing: (facing: CameraFacing) => void;
  setFilterMode: (mode: FilterMode) => void;
};

export const useAppStore = create<AppState>((set) => ({
  cameraFacing: "back",
  filterMode: "original",
  setCameraFacing: (cameraFacing) => set({ cameraFacing }),
  setFilterMode: (filterMode) => set({ filterMode }),
}));
