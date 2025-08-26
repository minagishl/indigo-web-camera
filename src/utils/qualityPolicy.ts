// Phase 1 Baseline Quality Policy Stub
// Simple heuristic used during capture to select JPEG quality.
// Future phases may incorporate device performance profiling, motion blur analysis,
// noise estimation, HDR fusion impact, etc.

export function decideJpegQuality(params: {
  megapixels: number;
  mode: string;
  qualityHint?: "speed" | "balanced" | "quality";
}): number {
  const { megapixels, mode, qualityHint } = params;

  if (qualityHint === "speed") return 0.85;
  if (megapixels > 9) return 0.9;
  if (mode === "night") return 0.92;
  return 0.88;
}
