"use client";
import { AppContext } from "../context";
import { useContext, useEffect, useState } from "react";
import CardGrid from "~/components/card-grid";
import { useRouter } from "next/navigation";
import { motion, useAnimation } from "framer-motion";

// Level calculation function
function getLevelRequirement(level: number): number {
  return Math.floor(10 * level + 5 * (level / 2));
}

// Circular progress component
const CircularProgress = ({
  revealsToNextLevel,
  totalRevealsForLevel,
}: {
  revealsToNextLevel: number;
  totalRevealsForLevel: number;
}) => {
  const progress =
    ((totalRevealsForLevel - revealsToNextLevel) / totalRevealsForLevel) * 100;
  const circumference = 2 * Math.PI * 45; // radius = 45
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative w-[16px] h-[16px]">
      <svg
        className="transform -rotate-90"
        viewBox="0 0 100 100"
        style={{
          width: "16px",
          height: "16px",
        }}
      >
        {/* Background ring */}
        <circle
          cx="50"
          cy="50"
          r="45"
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth="8"
          fill="none"
        />
        {/* Progress ring */}
        <circle
          cx="50"
          cy="50"
          r="45"
          stroke="white"
          strokeWidth="8"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          style={{
            transition: "stroke-dashoffset 0.5s ease-in-out",
          }}
        />
      </svg>
    </div>
  );
};

const ProfilePage = () => {
  const [state] = useContext(AppContext);
  const { push } = useRouter();
  const [displayAmount, setDisplayAmount] = useState(0);
  const controls = useAnimation();

  const handleViewAll = () => {
    push("/");
  };

  // Animate the total winnings number
  useEffect(() => {
    const targetAmount = state.user?.amount_won || 0;
    const duration = 2000; // 2 seconds
    const steps = 60; // 60 steps for smooth animation
    const increment = targetAmount / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= targetAmount) {
        setDisplayAmount(targetAmount);
        clearInterval(timer);
      } else {
        setDisplayAmount(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [state.user?.amount_won]);

  // Trigger entrance animations
  useEffect(() => {
    controls.start("visible");
  }, [controls]);

  return (
    <motion.div
      className="p-4 h-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Total Winnings Section */}
      <motion.div
        className="flex flex-col items-center justify-center gap-5 mb-8"
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <motion.p
          className="text-white/60 text-[16px] font-medium leading-[90%]"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          Total Winnings
        </motion.p>

        <motion.div
          initial={{ scale: 0.5, rotateY: -90 }}
          animate={{ scale: 1, rotateY: 0 }}
          transition={{
            delay: 0.5,
            duration: 1.2,
            ease: [0.25, 0.46, 0.45, 0.94],
            type: "spring",
            stiffness: 100,
            damping: 15,
          }}
        >
          <motion.p
            className="text-[64px] font-medium leading-[90%] text-white font-[ABCGaisyr]"
            style={{
              textShadow: "0px 0px 20px rgba(255, 255, 255, 0.3)",
            }}
            animate={{
              textShadow: [
                "0px 0px 20px rgba(255, 255, 255, 0.3)",
                "0px 0px 30px rgba(255, 255, 255, 0.5)",
                "0px 0px 20px rgba(255, 255, 255, 0.3)",
              ],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            {(displayAmount || 0).toLocaleString("en-US", {
              style: "currency",
              currency: "USD",
              minimumFractionDigits: 0,
              maximumFractionDigits: 2,
            })}
          </motion.p>
        </motion.div>
      </motion.div>

      <motion.div className="mb-16 flex items-center justify-center gap-2">
        <motion.p className="text-white text-[16px] font-medium leading-[90%]">
          Level {state.user?.current_level || 1}
        </motion.p>
        <motion.div
          className="bg-white/20 rounded-full"
          style={{ width: "3px", height: "3px" }}
        />

        {/* Circular Progress */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.6, ease: "easeOut" }}
        >
          <CircularProgress
            revealsToNextLevel={state.user?.reveals_to_next_level || 25}
            totalRevealsForLevel={getLevelRequirement(
              (state.user?.current_level || 1) + 1
            )}
          />
        </motion.div>

        <motion.p className="text-white text-[14px] font-medium leading-[90%] text-center">
          {state.user?.reveals_to_next_level || 25} scratch offs away from level{" "}
          {(state.user?.current_level || 1) + 1}
        </motion.p>
      </motion.div>

      {/* Scratch Offs Count Section */}
      <motion.div
        className="flex items-center w-full mb-6"
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1.2, duration: 0.6 }}
      >
        <motion.p
          className="text-white/60 text-[12px] font-medium leading-[90%]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4, duration: 0.8 }}
        >
          {state.user?.total_reveals || 0} SCRATCH OFFS
        </motion.p>

        {/* Animated underline */}
        <motion.div
          className="ml-2 h-[1px] bg-white/20"
          initial={{ width: 0 }}
          animate={{ width: "100px" }}
          transition={{ delay: 1.6, duration: 0.8, ease: "easeOut" }}
        />
      </motion.div>

      {/* Card Grid with staggered animation */}
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.8, duration: 0.8 }}
      >
        <CardGrid
          cards={state.cards || []}
          showViewAll={true}
          onCardSelect={() => {}}
          onViewAll={handleViewAll}
        />
      </motion.div>
    </motion.div>
  );
};

export default ProfilePage;
