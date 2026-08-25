"use client";

import { useTranslation } from "react-i18next";
import { useHomeAnimationReady } from "../HomeAnimationContext";
import ProfileAvatar from "./components/ProfileAvatar";
import ProfileCard from "./components/ProfileCard";
import ProfileIdentity from "./components/ProfileIdentity";
import ProfileInterests from "./components/ProfileInterests";
import ProfileQuote from "./components/ProfileQuote";
import { PROFILE_TOPIC_KEYS } from "./constants/profile";
import useProfileEntranceAnimation from "./hooks/useProfileEntranceAnimation";
import useProfileTilt from "./hooks/useProfileTilt";

/**
 * Profile 入口只负责准备翻译内容、组合视觉区块并连接两个交互 hook。
 */
export default function Profile() {
  const { t, i18n } = useTranslation();
  const homeAnimationReady = useHomeAnimationReady();
  const isEnglish = i18n.resolvedLanguage?.startsWith("en") ?? false;

  const {
    rootRef,
    entryRef,
    interactionReadyRef,
  } = useProfileEntranceAnimation(homeAnimationReady);
  const {
    cardRef,
    handlePointerMove,
    handlePointerLeave,
  } = useProfileTilt(interactionReadyRef);

  const writingTopics = PROFILE_TOPIC_KEYS.map((key) => t(key));

  return (
    <ProfileCard
      rootRef={rootRef}
      entryRef={entryRef}
      cardRef={cardRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      <ProfileAvatar isEnglish={isEnglish} />
      <ProfileIdentity
        isEnglish={isEnglish}
        role={t("profile.role")}
      />
      <ProfileInterests
        isEnglish={isEnglish}
        skillsTitle={t("profile.skills")}
        writingTitle={t("profile.writing")}
        writingTopics={writingTopics}
      />
      <ProfileQuote
        isEnglish={isEnglish}
        text={t("quote.text")}
        author={t("quote.author")}
      />
    </ProfileCard>
  );
}
