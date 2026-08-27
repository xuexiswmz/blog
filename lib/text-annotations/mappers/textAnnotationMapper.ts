import type {
  TextAnnotationDto,
  TextAnnotationRow,
} from "../types/textAnnotation";

export function toTextAnnotationDto(row: TextAnnotationRow): TextAnnotationDto {
  return {
    id: String(row.id),
    postSlug: String(row.post_slug),
    paragraphId: String(row.paragraph_id),
    startOffset: Number(row.start_offset),
    endOffset: Number(row.end_offset),
    selectedText: String(row.selected_text),
    lineStyle: row.line_style,
    color: row.color,
    createdAt: new Date(row.created_at).toISOString(),
  };
}
