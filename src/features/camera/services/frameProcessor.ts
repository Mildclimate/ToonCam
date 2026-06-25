import type { FilterMode } from "../types";

export type FrameProcessorInput = {
  width: number;
  height: number;
  filterMode: FilterMode;
};

export function processFrame(input: FrameProcessorInput): void {
  void input;
  // TODO: Replace with real frame processing pipeline.
}
