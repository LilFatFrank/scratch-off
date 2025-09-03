"use client";
import { useContext } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { AppContext } from "~/app/context";

const Activity = () => {
  const [state] = useContext(AppContext);

  // Helper function to format date properly (from wrapper.tsx)
  const formatDate = (dateString: string) => {
    try {
      // Parse the UTC timestamp and convert to local timezone
      const date = new Date(dateString + "Z"); // Add 'Z' to indicate UTC

      // Check if date is valid
      if (isNaN(date.getTime())) {
        return "Invalid date";
      }

      // Format in user's local timezone
      return date.toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Invalid date";
    }
  };

  const formatTimeAgo = (dateString: string) => {
    try {
      const date = new Date(dateString + "Z");
      const now = new Date();
      const diffInMs = now.getTime() - date.getTime();
      const diffInMinutes = Math.floor(diffInMs / (1000 * 60));

      // Check if it's today
      const isToday = date.toDateString() === now.toDateString();

      if (diffInMinutes < 60) {
        // 1 min ago up until 59 min ago
        return `${diffInMinutes} min ago`;
      } else if (isToday) {
        // Same day - show time like 1:00 pm
        return date.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        });
      } else {
        // Different day - show full date and time
        return formatDate(dateString);
      }
    } catch (error) {
      console.error("Error formatting time:", error);
      return "Invalid date";
    }
  };

  const truncateUsername = (username: string) => {
    return username.length > 15 ? username.substring(0, 15) + "..." : username;
  };

  if (state.activity.length === 0) {
    return (
      <div className="w-full pt-8 h-full overflow-y-auto">
        <div className="flex items-center justify-center h-64">
          <div className="text-white/60 text-center">
            <p>Could not load activity</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full pt-8 h-full overflow-y-auto">
      <motion.div
        className="space-y-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {state.activity.map((reveal, index) => (
          <motion.div
            key={reveal.id}
            className="flex items-center justify-between w-full"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: index * 0.01 }}
          >
            <div className="flex items-center gap-3">
              <Image
                src={reveal.pfp}
                alt={reveal.username}
                width={48}
                height={48}
                loading="lazy"
                className="rounded-full !w-[48px] !h-[48px] object-cover"
              />
              <div className="space-y-1">
                <p
                  className="text-[16px] font-bold leading-[90%] font-[ABCGaisyr]"
                  style={{
                    color:
                      reveal.prize_amount === 0
                        ? "rgba(255, 255, 255, 0.6)"
                        : "rgba(255, 255, 255, 1)",
                  }}
                >
                  {reveal.prize_amount === 0
                    ? "No win! :("
                    : `Won $${reveal.prize_amount}!`}
                </p>
                <p className="text-[12px] font-medium leading-[90%] text-white/60">
                  @{truncateUsername(reveal.username || "Unknown")}
                </p>
              </div>
            </div>
            <p className="text-[12px] font-medium leading-[90%] text-white/60">
              {formatTimeAgo(reveal.updated_at)}
            </p>
          </motion.div>
        ))}

        {state.activity.length === 0 && (
          <motion.div
            className="flex items-center justify-center h-64"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="text-white/60 text-center">
              <p className="text-lg font-medium mb-2">No Activity Yet</p>
              <p className="text-sm">Be the first to scratch a card!</p>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default Activity;
