import { toTextAnnotationDto } from "../mappers/textAnnotationMapper";
import {
  findTouchingTextAnnotations,
  replaceTouchingTextAnnotations,
} from "../repositories/textAnnotationRepository";
import type {
  CreateTextAnnotationInput,
  TextAnnotationDto,
} from "../types/textAnnotation";
import { mergeAnnotationRanges } from "../utils/mergeAnnotationRanges";

type CreateTextAnnotationResult =
  | {
      success: true;
      annotation: TextAnnotationDto;
      replacedIds: string[];
    }
  | {
      success: false;
      mergedRange: {
        startOffset: number;
        endOffset: number;
      };
    };

export async function createTextAnnotation(
  postSlug: string,
  input: CreateTextAnnotationInput,
): Promise<CreateTextAnnotationResult> {
  const existingAnnotations = await findTouchingTextAnnotations(
    postSlug,
    input.paragraphId,
    input.startOffset,
    input.endOffset,
  );

  const mergedRange = mergeAnnotationRanges(existingAnnotations, {
    startOffset: input.startOffset,
    endOffset: input.endOffset,
  });

  // 前端没有传递完整合并范围，拒绝本次写入。
  if (
    mergedRange.startOffset !== input.startOffset ||
    mergedRange.endOffset !== input.endOffset
  ) {
    return {
      success: false,
      mergedRange: {
        startOffset: mergedRange.startOffset,
        endOffset: mergedRange.endOffset,
      },
    };
  }

  const row = await replaceTouchingTextAnnotations(postSlug, input);

  return {
    success: true,
    annotation: toTextAnnotationDto(row),
    replacedIds: mergedRange.replacedIds,
  };
}
