import { ScratchDemo } from "~/components/scratch-off";

export default function Home() {
  return (
    <div className="max-w-md w-full relative">
      <div className="flex items-center justify-end w-full">
        {/* <button className="p-2 rounded-full bg-white/10 cursor-pointer">
          <img
            src={"/assets/info-icon.svg"}
            alt="info-icon"
            className="w-6 h-6"
          />
        </button> */}
      </div>
      <ScratchDemo />
      {/* <div className="absolute bg-black/80 bottom-[-10px] w-full rounded-[24px] p-6 z-[54]"></div> */}
    </div>
  );
}
