import Contents from "@/components/Content";
import HomeWelcome from "@/components/Content/HomeWelcome";

export default function Home() {
  return (
    <HomeWelcome>
      <div className=" h-full min-h-0 w-full flex">
        <Contents />
      </div>
    </HomeWelcome>
  );
}
