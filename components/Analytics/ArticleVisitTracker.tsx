"use client";

import { useEffect } from "react";
import { trackArticleVisit } from "./api/articleVisitApi";

export default function ArticleVisitTracker({ postSlug }: { postSlug: string }) {
  useEffect(() => {
    void trackArticleVisit(postSlug);
  }, [postSlug]);

  return null;
}
