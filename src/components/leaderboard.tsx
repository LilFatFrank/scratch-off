"use client";
import { useContext } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { AppContext } from "~/app/context";

const Leaderboard = () => {
  const [state] = useContext(AppContext);

  const textShadowStyle = {
    textShadow:
      "0px 0px 3px #A38800, 0px 0px 6px #A38800, 0px 0px 20px #A38800, 0px 0px 40px #A38800, 0px 0px 70px #A38800, 0px 0px 120px #A38800",
  };

  const formatAmount = (amount: number) => {
    return `${amount.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`;
  };

  const truncateUsername = (username: string) => {
    return username.length > 15 ? username.substring(0, 15) + '...' : username;
  };

  const getTopThree = () => {
    const topThree = state.leaderboard.slice(0, 3);
    return {
      first: topThree[0] || null,
      second: topThree[1] || null,
      third: topThree[2] || null,
    };
  };

  const getRestOfUsers = () => {
    return state.leaderboard.slice(3);
  };

  const { first, second, third } = getTopThree();
  const restOfUsers = getRestOfUsers();

  if (state.leaderboard.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white/60 text-center">
          <p>Could not load leaderboard</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full pt-8 h-full overflow-y-auto">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-start justify-center gap-5">
          {/* Second Place */}
          <motion.div 
            className="w-[80px] pt-12 flex flex-col items-center gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <p
              className="text-[18px] font-['ABCGaisyr'] text-center text-white font-bold italic leading-[90%]"
              style={textShadowStyle}
            >
              #2
            </p>
            <Image
              src={second?.pfp}
              alt="#2"
              width={80}
              height={80}
              loading="lazy"
              className="rounded-full w-[80px] h-[80px] object-cover"
              style={{ width: "80px", height: "80px" }}
            />
            <div className="space-y-1 text-center w-full">
              <p
                className="text-[24px] font-['ABCGaisyr'] text-center text-white font-bold italic leading-[90%]"
                style={textShadowStyle}
              >
                {second ? formatAmount(second.amount_won) : "$0"}
              </p>
              <p className="text-[12px] font-medium leading-[90%] text-white/60 w-full whitespace-nowrap overflow-hidden text-ellipsis">
                {second ? `@${truncateUsername(second.username)}` : "No data"}
              </p>
            </div>
          </motion.div>

          {/* First Place */}
          <motion.div 
            className="w-[112px] flex flex-col items-center gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <p
              className="text-[24px] font-['ABCGaisyr'] text-center text-white font-bold italic leading-[90%]"
              style={textShadowStyle}
            >
              #1
            </p>
            <Image
              src={first?.pfp}
              alt="#1"
              width={112}
              height={112}
              loading="lazy"
              className="rounded-full w-[112px] h-[112px] object-cover"
              style={{ width: "112px", height: "112px" }}
            />

            <div className="space-y-1 text-center w-full">
              <p
                className="text-[24px] font-['ABCGaisyr'] text-center text-white font-bold italic leading-[90%]"
                style={textShadowStyle}
              >
                {first ? formatAmount(first.amount_won) : "$0"}
              </p>
              <p className="text-[12px] font-medium leading-[90%] text-white/60 w-full whitespace-nowrap overflow-hidden text-ellipsis">
                {first ? `@${truncateUsername(first.username)}` : "No data"}
              </p>
            </div>
          </motion.div>

          {/* Third Place */}
          <motion.div 
            className="w-[80px] pt-16 flex flex-col items-center gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <p
              className="text-[18px] font-['ABCGaisyr'] text-center text-white font-bold italic leading-[90%]"
              style={textShadowStyle}
            >
              #3
            </p>
            <Image
              src={third?.pfp}
              alt="#3"
              width={80}
              height={80}
              loading="lazy"
              className="rounded-full w-[80px] h-[80px] object-cover"
              style={{ width: "80px", height: "80px" }}
            />
            <div className="space-y-1 w-full text-center">
              <p
                className="text-[24px] font-['ABCGaisyr'] text-center text-white font-bold italic leading-[90%]"
                style={textShadowStyle}
              >
                {third ? formatAmount(third.amount_won) : "$0"}
              </p>
              <p className="text-[12px] font-medium leading-[90%] text-white/60 w-full whitespace-nowrap overflow-hidden text-ellipsis ">
                {third ? `@${truncateUsername(third.username)}` : "No data"}
              </p>
            </div>
          </motion.div>
        </div>
        <motion.p 
          className="w-full text-center font-medium text-[12px] leading-[90%] text-white/60 mt-4 mb-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          TOP 100
        </motion.p>
        
        {/* Rest of the leaderboard starting from #4 */}
        <motion.div 
          className="space-y-4 mx-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {restOfUsers.map((user, index) => {
            const rank = index + 4; // Start from #4
            return (
              <motion.div
                key={user.wallet}
                className="flex items-center justify-between w-full"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + index * 0.05 }}
              >
                <div className="flex items-center gap-3">
                  <Image
                    src={user.pfp}
                    alt={`#${rank}`}
                    width={48}
                    height={48}
                    loading="lazy"
                    className="rounded-full object-cover w-12 h-12"
                    style={{ width: "48px", height: "48px" }}
                  />
                  <div className="space-y-1">
                    <p className="text-[16px] font-bold leading-[90%] text-white font-[ABCGaisyr]">
                      {formatAmount(user.amount_won)}
                    </p>
                    <p className="text-[12px] font-medium leading-[90%] text-white/60">
                      @{truncateUsername(user.username)}
                    </p>
                  </div>
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-[12px] font-medium leading-[90%] text-white/60">
                    #{rank}
                  </p>
                  <p className="text-[12px] font-medium leading-[90%] text-white/60">
                    {user.total_reveals} / {user.cards_count}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Leaderboard;
