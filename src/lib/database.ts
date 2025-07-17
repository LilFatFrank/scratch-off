import { Redis } from '@upstash/redis';

// Check if Redis environment variables are configured
const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

// Initialize Redis client only if environment variables are available
let redis: Redis | null = null;

if (redisUrl && redisToken) {
  try {
    redis = new Redis({
      url: redisUrl,
      token: redisToken,
    });
  } catch (error) {
    console.error('Failed to initialize Redis client:', error);
  }
} else {
  console.warn('Redis environment variables not configured. Database features will be disabled.');
}

export interface PastReveal {
  id: string;
  userWallet: string;
  prizeAmount: number;
  paymentTx: string;
  payoutTx?: string;
  timestamp: Date;
  won: boolean;
}

// Store a new reveal
export async function storeReveal(reveal: Omit<PastReveal, 'id' | 'timestamp'>) {
  if (!redis) {
    console.warn('Redis not configured, skipping reveal storage');
    return null;
  }

  const id = `reveal:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
  const timestamp = new Date();
  
  const fullReveal: PastReveal = {
    ...reveal,
    id,
    timestamp,
  };

  try {
    // Store in Redis with user wallet as key for user-specific reveals
    const userKey = `user:${reveal.userWallet}:reveals`;
    await redis.zadd(userKey, { score: timestamp.getTime(), member: JSON.stringify(fullReveal) });
    
    // Keep only last 3 reveals per user (cleanup old entries)
    await redis.zremrangebyrank(userKey, 0, -4);
    return fullReveal;
  } catch (error) {
    console.error('Failed to store reveal:', error);
    return null;
  }
}

// Get user's recent reveals (last 3)
export async function getUserReveals(userWallet: string, limit: number = 3): Promise<PastReveal[]> {
  if (!redis) {
    console.warn('Redis not configured, returning empty reveals');
    return [];
  }

  try {
    const userKey = `user:${userWallet}:reveals`;
    const reveals = await redis.zrange(userKey, -limit, -1, { rev: true });
    
    return reveals
      .map((reveal: unknown) => {
        try {
          // Handle both string and object formats
          let parsed;
          if (typeof reveal === 'string') {
            parsed = JSON.parse(reveal);
          } else if (typeof reveal === 'object' && reveal !== null) {
            parsed = reveal;
          } else {
            console.error('Invalid reveal format:', reveal);
            return null;
          }
          
          return {
            ...parsed,
            timestamp: new Date(parsed.timestamp),
          };
        } catch (error) {
          console.error('Error parsing reveal:', error);
          return null;
        }
      })
      .filter(Boolean) as PastReveal[];
  } catch (error) {
    console.error('Failed to get user reveals:', error);
    return [];
  }
}

// Get user statistics
export async function getUserStats(userWallet: string) {
  const userReveals = await getUserReveals(userWallet, 3);
  
  const totalReveals = userReveals.length;
  const totalWins = userReveals.filter((r: PastReveal) => r.won).length;
  const totalPrizeAmount = userReveals.reduce((sum: number, r: PastReveal) => sum + r.prizeAmount, 0);
  const winRate = totalReveals > 0 ? (totalWins / totalReveals) * 100 : 0;
  
  return {
    totalReveals,
    totalWins,
    totalPrizeAmount,
    winRate: Math.round(winRate * 100) / 100, // Round to 2 decimal places
  };
}
