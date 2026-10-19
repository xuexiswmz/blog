export function isSafePostSlug(postSlug: string): boolean {
  return Boolean(
    postSlug &&
      postSlug === postSlug.trim() &&
      postSlug !== "." &&
      postSlug !== ".." &&
      !postSlug.includes("/") &&
      !postSlug.includes("\\") &&
      !postSlug.includes("\0"),
  );
}
