import { StyleSheet, View } from "react-native";
import type { CartoonFrame } from "../services/frameProcessor";

type FilterPreviewProps = {
  frame: CartoonFrame | null;
};

export function FilterPreview({ frame }: FilterPreviewProps) {
  return (
    <View style={styles.container}>
      {frame ? (
        <View style={styles.previewCanvas}>
          {frame.cells.map((cell, index) => {
            const column = index % frame.columns;
            const row = Math.floor(index / frame.columns);

            return (
              <View
                key={`${row}-${column}`}
                style={[
                  styles.previewCell,
                  {
                    backgroundColor: cell.color,
                    left: `${(column / frame.columns) * 100}%`,
                    top: `${(row / frame.rows) * 100}%`,
                    width: `${100 / frame.columns}%`,
                    height: `${100 / frame.rows}%`,
                  },
                ]}
              />
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: "hidden",
    backgroundColor: "#0f172a",
  },
  previewCanvas: {
    flex: 1,
    position: "relative",
    overflow: "hidden",
    backgroundColor: "#050816",
  },
  previewCell: {
    position: "absolute",
  },
});
