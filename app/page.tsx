import Contents from "@/components/Content";
import HomeWelcome from "@/components/Content/HomeWelcome";
import type { Metadata } from "next";

export const metadata: Metadata = {
  alternates: {
    canonical: "/",
  },
};

export default function Home() {
  return (
    <HomeWelcome>
      <div className=" h-full min-h-0 w-full flex">
        <Contents />
      </div>
    </HomeWelcome>
  );
}
