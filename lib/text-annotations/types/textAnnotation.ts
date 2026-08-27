export type TextAnnotationLineStyle =
  | "solid"
  | "double"
  | "wavy";

export type TextAnnotationColor =
  | "amber"
  | "rose"
  | "sky"
  | "emerald"
  | "violet";

export type TextAnnotationRow = {
  id: string;
  post_slug: string;
  paragraph_id: string;
  start_offset: number;
  end_offset: number;
  selected_text: string;
  line_style: TextAnnotationLineStyle;
  color: TextAnnotationColor;
  created_at: string | Date;
};

export type TextAnnotationDto = {
  id: string;
  postSlug: string;
  paragraphId: string;
  startOffset: number;
  endOffset: number;
  selectedText: string;
  lineStyle: TextAnnotationLineStyle;
  color: TextAnnotationColor;
  createdAt: string;
};

export type CreateTextAnnotationInput = Omit<
  TextAnnotationDto,
  "id" | "postSlug" | "createdAt"
>;

export type UpdateTextAnnotationInput = Pick<
  TextAnnotationDto,
  "lineStyle" | "color"
>;

export type ValidationResult<T> =
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      message: string;
    };
