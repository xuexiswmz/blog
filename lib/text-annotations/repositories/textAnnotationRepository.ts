import { sql } from "@/lib/db";
import type { ExistingAnnotationRange } from "../utils/mergeAnnotationRanges";
import type {
  CreateTextAnnotationInput,
  TextAnnotationColor,
  TextAnnotationLineStyle,
  TextAnnotationRow,
  UpdateTextAnnotationInput,
} from "../types/textAnnotation";

function parseLineStyle(value: unknown): TextAnnotationLineStyle {
  if (value === "solid" || value === "double" || value === "wavy") {
    return value;
  }

  throw new Error("数据库中的画线类型不合法");
}

function parseColor(value: unknown): TextAnnotationColor {
  if (
    value === "amber" ||
    value === "rose" ||
    value === "sky" ||
    value === "emerald" ||
    value === "violet"
  ) {
    return value;
  }

  throw new Error("数据库中的画线颜色不合法");
}

function toTextAnnotationRow(row: Record<string, unknown>): TextAnnotationRow {
  return {
    id: String(row.id),
    post_slug: String(row.post_slug),
    paragraph_id: String(row.paragraph_id),
    start_offset: Number(row.start_offset),
    end_offset: Number(row.end_offset),
    selected_text: String(row.selected_text),
    line_style: parseLineStyle(row.line_style),
    color: parseColor(row.color),
    created_at:
      row.created_at instanceof Date ? row.created_at : String(row.created_at),
  };
}

export async function listTextAnnotations(
  postSlug: string,
): Promise<TextAnnotationRow[]> {
  const rows = await sql`
    select
      id,
      post_slug,
      paragraph_id,
      start_offset,
      end_offset,
      selected_text,
      line_style,
      color,
      created_at
    from text_annotations
    where post_slug = ${postSlug}
    order by
      paragraph_id asc,
      start_offset asc
  `;

  return rows.map(toTextAnnotationRow);
}

export async function findTouchingTextAnnotations(
  postSlug: string,
  paragraphId: string,
  startOffset: number,
  endOffset: number,
): Promise<ExistingAnnotationRange[]> {
  const rows = await sql`
    select
      id,
      start_offset,
      end_offset
    from text_annotations
    where post_slug = ${postSlug}
      and paragraph_id = ${paragraphId}
      and end_offset >= ${startOffset}
      and start_offset <= ${endOffset}
    order by start_offset asc
  `;

  return rows.map((row) => ({
    id: String(row.id),
    startOffset: Number(row.start_offset),
    endOffset: Number(row.end_offset),
  }));
}

export async function replaceTouchingTextAnnotations(
  postSlug: string,
  input: CreateTextAnnotationInput,
): Promise<TextAnnotationRow> {
  const results = await sql.transaction((transactionSql) => [
    transactionSql`
        delete from text_annotations
        where post_slug = ${postSlug}
          and paragraph_id = ${input.paragraphId}
          and end_offset >= ${input.startOffset}
          and start_offset <= ${input.endOffset}
      `,

    transactionSql`
        insert into text_annotations (
          post_slug,
          paragraph_id,
          start_offset,
          end_offset,
          selected_text,
          line_style,
          color
        )
        values (
          ${postSlug},
          ${input.paragraphId},
          ${input.startOffset},
          ${input.endOffset},
          ${input.selectedText},
          ${input.lineStyle},
          ${input.color}
        )
        returning
          id,
          post_slug,
          paragraph_id,
          start_offset,
          end_offset,
          selected_text,
          line_style,
          color,
          created_at
      `,
  ]);

  const insertedRow = results[1]?.[0];

  if (!insertedRow) {
    throw new Error("新增画线后没有返回数据");
  }

  return toTextAnnotationRow(insertedRow);
}

export async function updateTextAnnotation(
  postSlug: string,
  annotationId: string,
  input: UpdateTextAnnotationInput,
): Promise<TextAnnotationRow | null> {
  const rows = await sql`
    update text_annotations
    set
      line_style = ${input.lineStyle},
      color = ${input.color},
      updated_at = now()
    where id = ${annotationId}::uuid
      and post_slug = ${postSlug}
    returning
      id,
      post_slug,
      paragraph_id,
      start_offset,
      end_offset,
      selected_text,
      line_style,
      color,
      created_at
  `;

  const row = rows[0];

  return row ? toTextAnnotationRow(row) : null;
}

export async function deleteTextAnnotation(
  postSlug: string,
  annotationId: string,
): Promise<boolean> {
  const rows = await sql`
    delete from text_annotations
    where id = ${annotationId}::uuid
      and post_slug = ${postSlug}
    returning id
  `;

  return rows.length > 0;
}
