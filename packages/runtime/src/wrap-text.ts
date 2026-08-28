export type FontMeasure = {
  getTextWidth(text: string): number;
};

/**
 * Word-wrap `text` into lines that fit `maxWidth` using `measure` for per-word
 * widths. Words longer than `maxWidth` are clipped to the line instead of
 * overflowing forever. Returns an array of wrapped lines.
 */
export function wrapText(text: string, measure: FontMeasure, maxWidth: number): string[] {
  if (maxWidth <= 0) return [text];

  const lines: string[] = [];
  const paragraphs = text.split("\n");
  for (const paragraph of paragraphs) {
    if (paragraph.length === 0) {
      lines.push("");
      continue;
    }

    const words = paragraph.split(" ");
    let line = "";
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (measure.getTextWidth(candidate) <= maxWidth || !line) {
        line = candidate;
      } else {
        lines.push(line);
        line = word;
      }
    }
    lines.push(line);
  }

  return lines;
}
