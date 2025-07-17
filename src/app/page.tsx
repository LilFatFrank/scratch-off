"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ScratchDemo } from "~/components/scratch-off";
import Image from "next/image";

export default function Home() {
  const [showInfo, setShowInfo] = useState(false);

  return (
    <div className="max-w-md w-full relative">
      <div className="flex items-center justify-end w-full">
        <button
          className="p-2 rounded-full bg-white/10 cursor-pointer hover:bg-white/20 transition-colors"
          onClick={() => setShowInfo(!showInfo)}
        >
          <img
            src={"/assets/info-icon.svg"}
            alt="info-icon"
            className="w-6 h-6"
          />
        </button>
      </div>
      <ScratchDemo />

      <AnimatePresence>
        {showInfo && (
          <motion.div
            className="absolute bg-black/80 backdrop-blur-sm bottom-[-10px] w-full rounded-[24px] p-6 z-[54]"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 30,
              duration: 0.3,
            }}
          >
            <div className="relative space-y-6">
              <div className="flex justify-between items-center">
                <p className="text-[18px] leading-[90%] text-white font-semibold">
                  Info
                </p>
                <button
                  className="absolute top-[-16px] right-[-16px] p-2 rounded-full bg-white/[0.09] cursor-pointer"
                  onClick={() => setShowInfo(false)}
                >
                  <Image src={"/assets/cross-icon.svg"} alt="cross-icon" width={18} height={18} unoptimized priority />
                </button>
              </div>
              <p className="text-[18px] leading-[130%] text-white font-semibold">
                We&apos;re transforming the crypto experience into something
                everyone can enjoy, starting with the simple joy of scratch
                cards - a game that billions already know and love
              </p>
              <hr className="border-[0.5px] border-white/10" />
              <p className="text-[15px] leading-[120%] text-white font-medium">
                We&apos;re transforming the crypto experience into something
                everyone can enjoy, starting with the simple joy of scratch
                cards - a game that billions already know and love
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
