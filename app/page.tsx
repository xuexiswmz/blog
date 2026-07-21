import Contents from "@/components/Content";
import Headers from "@/components/Headers";

export default function Home() {
  return (
    <div className=" h-dvh w-full flex">
      <div className="flex w-[85%] mx-auto h-full min-h-0 flex-col ">
        <Headers />
        <Contents /> 
      </div>
      </div>
  );
}
  