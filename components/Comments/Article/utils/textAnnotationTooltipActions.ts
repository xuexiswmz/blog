export function getTextAnnotationTooltipActions(
  commentCount: number,
  canManageTextAnnotations: boolean,
) {
  const showAddComment = commentCount === 0;

  const showManageAnnotation = canManageTextAnnotations;

  return {
    showAddComment,
    showManageAnnotation,

    shouldRender: showAddComment || showManageAnnotation,
  };
}
