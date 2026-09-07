import { describe, expect, it } from "vitest";
import { metadata as rootMetadata } from "./layout";
import { metadata as homeMetadata } from "./page";
import { metadata as graphMetadata } from "./graph/page";
import { generateMetadata as generatePostMetadata } from "./posts/[slug]/page";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/seo/site";

describe("public page metadata", () => {
  it("provides a Chinese site identity and an absolute metadata base", () => {
    expect(rootMetadata.metadataBase).toEqual(new URL(SITE_URL));
    expect(rootMetadata.title).toEqual({
      default: SITE_NAME,
      template: `%s | ${SITE_NAME}`,
    });
    expect(rootMetadata.description).toBe(SITE_DESCRIPTION);
    expect(rootMetadata.openGraph).toMatchObject({
      type: "website",
      locale: "zh_CN",
      siteName: SITE_NAME,
      title: SITE_NAME,
      description: SITE_DESCRIPTION,
    });
    expect(rootMetadata.twitter).toMatchObject({
      card: "summary",
      title: SITE_NAME,
      description: SITE_DESCRIPTION,
    });
  });

  it("uses a self-referencing canonical path for each public route", async () => {
    expect(homeMetadata.alternates).toEqual({ canonical: "/" });
    expect(graphMetadata.alternates).toEqual({ canonical: "/graph" });

    await expect(
      generatePostMetadata({
        params: Promise.resolve({ slug: "css-grid" }),
      }),
    ).resolves.toEqual({
      alternates: { canonical: "/posts/css-grid" },
    });
  });
});
