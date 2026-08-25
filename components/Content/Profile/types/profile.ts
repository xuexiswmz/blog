import type {
  PointerEventHandler,
  ReactNode,
  RefObject,
} from "react";

export type ProfileCardProps = {
  children: ReactNode;
  rootRef: RefObject<HTMLElement | null>;
  entryRef: RefObject<HTMLDivElement | null>;
  cardRef: RefObject<HTMLDivElement | null>;
  onPointerMove: PointerEventHandler<HTMLDivElement>;
  onPointerLeave: PointerEventHandler<HTMLDivElement>;
};

export type ProfileLanguageProps = {
  isEnglish: boolean;
};

export type ProfileIdentityProps = ProfileLanguageProps & {
  role: string;
};

export type ProfileInterestsProps = ProfileLanguageProps & {
  skillsTitle: string;
  writingTitle: string;
  writingTopics: string[];
};

export type ProfileQuoteProps = ProfileLanguageProps & {
  text: string;
  author: string;
};
