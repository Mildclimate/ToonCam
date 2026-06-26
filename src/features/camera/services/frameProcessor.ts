import type { FilterMode } from "../types";

export type FrameProcessorInput = {
  width: number;
  height: number;
  pixels: Uint8Array;
  filterMode: FilterMode;
};

export type CartoonPreviewCell = {
  color: string;
  isEdge: boolean;
};

export type CartoonFrame = {
  columns: number;
  rows: number;
  cells: CartoonPreviewCell[];
};

const EDGE_COLOR = "#0b0f14";
const ORIGINAL_LEVELS = 10;
const SOFT_LEVELS = 6;
const STRONG_LEVELS = 4;

function clampChannel(value: number) {
  "worklet";
  return Math.max(0, Math.min(255, value));
}

function samplePixel(
  pixels: Uint8Array,
  width: number,
  height: number,
  x: number,
  y: number,
) {
  "worklet";
  const safeX = Math.max(0, Math.min(width - 1, x));
  const safeY = Math.max(0, Math.min(height - 1, y));
  const safeIndex = (safeY * width + safeX) * 4;

  return {
    blue: pixels[safeIndex] ?? 0,
    green: pixels[safeIndex + 1] ?? 0,
    red: pixels[safeIndex + 2] ?? 0,
  };
}

function getLuminance(red: number, green: number, blue: number) {
  "worklet";
  return 0.299 * red + 0.587 * green + 0.114 * blue;
}

function posterizeChannel(value: number, levels: number) {
  "worklet";
  const step = 255 / Math.max(1, levels - 1);
  return clampChannel(Math.round(value / step) * step);
}

function adjustContrast(value: number, contrast: number) {
  "worklet";
  return clampChannel((value - 128) * contrast + 128);
}

function boostSaturation(
  red: number,
  green: number,
  blue: number,
  amount: number,
) {
  "worklet";
  const average = (red + green + blue) / 3;

  return {
    red: clampChannel(average + (red - average) * amount),
    green: clampChannel(average + (green - average) * amount),
    blue: clampChannel(average + (blue - average) * amount),
  };
}

export function processFrame(input: FrameProcessorInput): CartoonFrame {
  "worklet";

  const columns = 18;
  const aspectRatio = input.height / input.width;
  const rows = Math.max(12, Math.round(columns * aspectRatio * 0.82));
  const cellWidth = input.width / columns;
  const cellHeight = input.height / rows;
  const luminances = new Array<number>(columns * rows);
  const samples = new Array<{ red: number; green: number; blue: number }>(
    columns * rows,
  );

  const levels =
    input.filterMode === "toon-strong"
      ? STRONG_LEVELS
      : input.filterMode === "toon-soft"
        ? SOFT_LEVELS
        : ORIGINAL_LEVELS;

  const saturationBoost =
    input.filterMode === "toon-strong"
      ? 1.35
      : input.filterMode === "toon-soft"
        ? 1.15
        : 1.0;

  const contrast =
    input.filterMode === "toon-strong"
      ? 1.35
      : input.filterMode === "toon-soft"
        ? 1.12
        : 1.0;

  const edgeThreshold =
    input.filterMode === "toon-strong"
      ? 18
      : input.filterMode === "toon-soft"
        ? 28
        : 36;

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const centerX = Math.round((column + 0.5) * cellWidth);
      const centerY = Math.round((row + 0.5) * cellHeight);

      const offsets = [
        { x: 0, y: 0 },
        { x: -0.22, y: -0.18 },
        { x: 0.22, y: -0.18 },
        { x: -0.18, y: 0.22 },
        { x: 0.18, y: 0.22 },
      ];

      let redTotal = 0;
      let greenTotal = 0;
      let blueTotal = 0;

      for (const offset of offsets) {
        const pixel = samplePixel(
          input.pixels,
          input.width,
          input.height,
          Math.round(centerX + offset.x * cellWidth),
          Math.round(centerY + offset.y * cellHeight),
        );

        redTotal += pixel.red;
        greenTotal += pixel.green;
        blueTotal += pixel.blue;
      }

      const averageRed = redTotal / offsets.length;
      const averageGreen = greenTotal / offsets.length;
      const averageBlue = blueTotal / offsets.length;

      samples[row * columns + column] = {
        red: averageRed,
        green: averageGreen,
        blue: averageBlue,
      };

      luminances[row * columns + column] = getLuminance(
        averageRed,
        averageGreen,
        averageBlue,
      );
    }
  }

  const cells: CartoonPreviewCell[] = new Array(columns * rows);

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const index = row * columns + column;
      const currentSample = samples[index];

      const rightLum =
        column < columns - 1 ? luminances[index + 1] : luminances[index];
      const downLum =
        row < rows - 1 ? luminances[index + columns] : luminances[index];
      const diagonalLum =
        column < columns - 1 && row < rows - 1
          ? luminances[index + columns + 1]
          : luminances[index];

      const edgeScore =
        Math.abs(luminances[index] - rightLum) +
        Math.abs(luminances[index] - downLum) +
        Math.abs(luminances[index] - diagonalLum);

      if (edgeScore > edgeThreshold) {
        cells[index] = {
          color: EDGE_COLOR,
          isEdge: true,
        };
        continue;
      }

      const adjustedRed = adjustContrast(currentSample.red, contrast);
      const adjustedGreen = adjustContrast(currentSample.green, contrast);
      const adjustedBlue = adjustContrast(currentSample.blue, contrast);

      const saturated = boostSaturation(
        adjustedRed,
        adjustedGreen,
        adjustedBlue,
        saturationBoost,
      );

      const posterizedRed = posterizeChannel(saturated.red, levels);
      const posterizedGreen = posterizeChannel(saturated.green, levels);
      const posterizedBlue = posterizeChannel(saturated.blue, levels);

      cells[index] = {
        color: `rgb(${posterizedRed}, ${posterizedGreen}, ${posterizedBlue})`,
        isEdge: false,
      };
    }
  }

  return {
    columns,
    rows,
    cells,
  };
}
