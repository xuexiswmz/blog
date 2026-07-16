import Contents from "@/components/Content";
import Headers from "@/components/Headers";

export default function Home() {
  return (
    <div className=" h-full w-full flex items-center justify-center">
      <div className="flex w-[80%] flex-col items-center justify-center">
        <Headers />
        <Contents /> 
        </div>
      </div>
  );
}
  