import { createRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ProfileAvatar from "./ProfileAvatar";
import ProfileCard from "./ProfileCard";
import ProfileIdentity from "./ProfileIdentity";
import ProfileInterests from "./ProfileInterests";
import ProfileQuote from "./ProfileQuote";

describe("Profile responsive layout", () => {
  it("keeps profile sections top-aligned and scrollable instead of stretching them apart", () => {
    const markup = renderToStaticMarkup(
      <ProfileCard
        rootRef={createRef<HTMLElement>()}
        entryRef={createRef<HTMLDivElement>()}
        cardRef={createRef<HTMLDivElement>()}
        onPointerMove={() => undefined}
        onPointerLeave={() => undefined}
      >
        <div>Avatar</div>
        <div>Identity</div>
        <div>Interests</div>
        <div>Quote</div>
      </ProfileCard>,
    );

    expect(markup).toContain("justify-start");
    expect(markup).not.toContain("justify-between");
    expect(markup).toContain("overflow-y-auto");
    expect(markup).not.toContain("mt-[clamp(");
  });

  it("renders viewport-aware sizes for the profile content", () => {
    const markup = renderToStaticMarkup(
      <>
        <ProfileAvatar isEnglish />
        <ProfileIdentity isEnglish role="Frontend Developer" />
        <ProfileInterests
          isEnglish
          skillsTitle="Skills"
          writingTitle="Writing"
          writingTopics={["Frontend Engineering"]}
        />
        <ProfileQuote isEnglish text="A short quote" author="Author" />
      </>,
    );

    expect(markup).toContain("size-[clamp(");
    expect(markup).toContain("text-[clamp(");
    expect(markup).toContain("gap-[clamp(");
  });
});
