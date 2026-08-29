export type PosterPlacement = {
  width: number;
  height: number;
  x: number;
  y: number;
};

const TARGET_WIDTH = 1080;
const TARGET_HEIGHT = 1350;

export function calculateFourByFivePlacement(
  width: number,
  height: number,
): PosterPlacement {
  if (!Number.isInteger(width) || !Number.isInteger(height)) {
    throw new Error("Poster dimensions must be whole numbers.");
  }
  if (width < 1 || height < 1) {
    throw new Error("Poster dimensions must be positive.");
  }

  const scale = Math.min(TARGET_WIDTH / width, TARGET_HEIGHT / height);
  const placedWidth = Math.round(width * scale);
  const placedHeight = Math.round(height * scale);
  return {
    width: placedWidth,
    height: placedHeight,
    x: Math.floor((TARGET_WIDTH - placedWidth) / 2),
    y: Math.floor((TARGET_HEIGHT - placedHeight) / 2),
  };
}
