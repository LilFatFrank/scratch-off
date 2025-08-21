"use client";
import { useContext, useEffect, useState } from "react";
import { motion, PanInfo, useAnimation } from "framer-motion";
import { AppContext } from "../context";
import { APP_COLORS } from "../../lib/constants";
import { SET_APP_BACKGROUND } from "../context/actions";
import Leaderboard from "../../components/leaderboard";
import Activity from "../../components/activity";

const Tabs = ({
  tabs,
  activeTab,
  onTabChange,
}: {
  tabs: { id: string; label: string }[];
  activeTab: string;
  onTabChange: (tab: string) => void;
}) => {
  return (
    <ul className="flex backdrop-blur-sm">
      {tabs.map((tab, idx) => (
        <motion.li
          key={tab.id}
          className={`flex-1 ${
            idx === 0 ? "pr-0" : idx === tabs.length - 1 ? "pl-0" : "px-0"
          }`}
        >
          <motion.button
            className="relative w-full py-3 px-4 rounded-[1000px] transition-colors duration-200"
            onClick={() => onTabChange(tab.id)}
          >
            <span className="relative z-10 text-white font-semibold leading-[90%] text-[16px]">
              {tab.label}
            </span>

            {tab.id === activeTab ? (
              <motion.span
                layoutId="activeTab"
                id="activeTab"
                transition={{
                  type: "spring",
                  stiffness: 600,
                  damping: 40,
                }}
                className="absolute inset-0 rounded-[1000px] shadow-lg"
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.15)",
                }}
              />
            ) : null}
          </motion.button>
        </motion.li>
      ))}
    </ul>
  );
};

const LeaderboardPage = () => {
  const [, dispatch] = useContext(AppContext);
  const [activeTab, setActiveTab] = useState<string>("leaderboard");
  const controls = useAnimation();

  const tabs = [
    { id: "leaderboard", label: "Leaderboard" },
    { id: "activity", label: "Activity" },
  ];

  useEffect(() => {
    dispatch({
      type: SET_APP_BACKGROUND,
      payload: `linear-gradient(to bottom, #090210, ${APP_COLORS.LEADERBOARD})`,
    });
  }, []);

  const handleDragEnd = async (event: any, info: PanInfo) => {
    const swipeThreshold = 50;
    const { offset, velocity } = info;

    if (Math.abs(offset.x) > swipeThreshold || Math.abs(velocity.x) > 500) {
      if (offset.x > 0 && activeTab === "activity") {
        // Swipe right to go to leaderboard
        await controls.start({ x: "100%", opacity: 0 });
        setActiveTab("leaderboard");
        await controls.start({ x: "-100%", opacity: 0 });
        await controls.start({ x: 0, opacity: 1 });
      } else if (offset.x < 0 && activeTab === "leaderboard") {
        // Swipe left to go to activity
        await controls.start({ x: "-100%", opacity: 0 });
        setActiveTab("activity");
        await controls.start({ x: "100%", opacity: 0 });
        await controls.start({ x: 0, opacity: 1 });
      }
    } else {
      // Snap back if swipe wasn't strong enough
      await controls.start({ x: 0, opacity: 1 });
    }
  };

  const handleTabChange = async (tabId: string) => {
    if (tabId === activeTab) return;

    const direction = tabId === "activity" ? -1 : 1;
    
    await controls.start({ x: `${direction * 100}%`, opacity: 0 });
    setActiveTab(tabId);
    await controls.start({ x: `${-direction * 100}%`, opacity: 0 });
    await controls.start({ x: 0, opacity: 1 });
  };

  return (
    <div className="p-4 h-full">
      {/* Tab Navigation */}
      <div className="max-w-[222px] mx-auto">
        <Tabs tabs={tabs} activeTab={activeTab} onTabChange={handleTabChange} />
      </div>
      
      {/* Swipeable Content */}
      <motion.div 
        className="w-full relative overflow-y-auto h-[92%]"
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        animate={controls}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        <motion.div
          className="w-full"
          initial={{ x: 0, opacity: 1 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        >
          {activeTab === "leaderboard" && <Leaderboard />}
          {activeTab === "activity" && <Activity />}
        </motion.div>
      </motion.div>
    </div>
  );
};

export default LeaderboardPage;
