"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { User } from "../app/interface/user";

const LeaderboardSkeleton = () => {
  return (
    <div className="w-full pt-8 h-full overflow-y-auto">
      {/* Podium Skeleton */}
      <div className="flex items-start justify-center gap-5">
        {/* Second Place Skeleton */}
        <motion.div 
          className="w-[80px] pt-12 flex flex-col items-center gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <motion.div
            className="h-6 w-8 bg-white/10 rounded"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
          <motion.div
            className="w-[80px] h-[80px] rounded-full bg-white/10"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
          />
          <div className="space-y-2 text-center w-full">
            <motion.div
              className="h-6 w-20 bg-white/10 rounded mx-auto"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
            />
            <motion.div
              className="h-3 w-16 bg-white/10 rounded mx-auto"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
            />
          </div>
        </motion.div>

        {/* First Place Skeleton */}
        <motion.div 
          className="w-[112px] flex flex-col items-center gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <motion.div
            className="h-8 w-10 bg-white/10 rounded"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
          <motion.div
            className="w-[112px] h-[112px] rounded-full bg-white/10"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
          />
          <div className="space-y-2 text-center w-full">
            <motion.div
              className="h-6 w-24 bg-white/10 rounded mx-auto"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
            />
            <motion.div
              className="h-3 w-18 bg-white/10 rounded mx-auto"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
            />
          </div>
        </motion.div>

        {/* Third Place Skeleton */}
        <motion.div 
          className="w-[80px] pt-16 flex flex-col items-center gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <motion.div
            className="h-6 w-8 bg-white/10 rounded"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
          <motion.div
            className="w-[80px] h-[80px] rounded-full bg-white/10"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
          />
          <div className="space-y-2 text-center w-full">
            <motion.div
              className="h-6 w-20 bg-white/10 rounded mx-auto"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
            />
            <motion.div
              className="h-3 w-16 bg-white/10 rounded mx-auto"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
            />
          </div>
        </motion.div>
      </div>

      {/* TOP 100 Label Skeleton */}
      <motion.div
        className="w-full text-center mt-4 mb-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <motion.div
          className="h-3 w-16 bg-white/10 rounded mx-auto"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      </motion.div>

      {/* User List Skeleton */}
      <div className="space-y-4 mx-auto">
        {[...Array(10)].map((_, index) => (
          <motion.div
            key={index}
            className="flex items-center justify-between w-full"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 + index * 0.05 }}
          >
            <div className="flex items-center gap-3">
              <motion.div
                className="w-12 h-12 rounded-full bg-white/10"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              <div className="space-y-2">
                <motion.div
                  className="h-4 w-20 bg-white/10 rounded"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
                />
                <motion.div
                  className="h-3 w-16 bg-white/10 rounded"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
                />
              </div>
            </div>
            <div className="space-y-1 text-right">
              <motion.div
                className="h-3 w-8 bg-white/10 rounded ml-auto"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.6 }}
              />
              <motion.div
                className="h-3 w-12 bg-white/10 rounded ml-auto"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.8 }}
              />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

const Leaderboard = () => {
  const [leaderboardData, setLeaderboardData] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch('/api/users/leaderboard');
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch leaderboard');
        }
        
        setLeaderboardData(data.leaderboard || []);
      } catch (err) {
        console.error('Error fetching leaderboard:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch leaderboard');
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  const textShadowStyle = {
    textShadow:
      "0px 0px 3.91px #A38800, 0px 0px 7.82px #A38800, 0px 0px 27.38px #A38800, 0px 0px 54.76px #A38800, 0px 0px 93.88px #A38800, 0px 0px 164.29px #A38800",
  };

  const formatAmount = (amount: number) => {
    return `$${amount.toLocaleString()}`;
  };

  const truncateUsername = (username: string) => {
    return username.length > 15 ? username.substring(0, 15) + '...' : username;
  };

  const getTopThree = () => {
    const topThree = leaderboardData.slice(0, 3);
    return {
      first: topThree[0] || null,
      second: topThree[1] || null,
      third: topThree[2] || null,
    };
  };

  const getRestOfUsers = () => {
    return leaderboardData.slice(3);
  };

  const { first, second, third } = getTopThree();
  const restOfUsers = getRestOfUsers();

  if (loading) {
    return <LeaderboardSkeleton />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white/60 text-center">
          <p>Error loading leaderboard</p>
          <p className="text-sm text-white/60 mt-2">{error}</p>
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
              src={second?.pfp || "/images/leaderboard/2.png"}
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
              src={first?.pfp || "/images/leaderboard/1.png"}
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
              src={third?.pfp || "/images/leaderboard/3.png"}
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
