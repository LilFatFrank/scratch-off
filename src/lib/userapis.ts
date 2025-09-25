import { supabase } from "./supabase";

// Fetch user info when wallet connects
export const fetchUserInfo = async (userWallet: string) => {
  if (!userWallet) return;

  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('wallet', userWallet)
      .single();

    if (error) {
      console.error("Failed to fetch user info:", error);
      return {};
    }

    return data;
  } catch (error) {
    console.error("Failed to fetch user info:", error);
    return {}; // Return empty object instead of throwing
  }
};

// Fetch user cards when wallet connects
export const fetchUserCards = async (userWallet: string) => {
  if (!userWallet) return;

  try {
    const { data, error } = await supabase
      .from('cards')
      .select('*')
      .eq('user_wallet', userWallet)
      .order('card_no', { ascending: false })
      .limit(1000);

    if (error) {
      console.error("Failed to fetch user cards:", error);
      return [];
    }

    return data;
  } catch (error) {
    console.error("Failed to fetch user cards:", error);
    return []; // Return empty array instead of throwing
  }
};

// Fetch app stats
export const fetchAppStats = async () => {
  try {
    const { data, error } = await supabase
      .from('stats')
      .select('*')
      .single();

    if (error) {
      console.error("Failed to fetch app stats:", error);
      return {};
    }

    return data;
  } catch (error) {
    console.error("Failed to fetch app stats:", error);
    return {};
  }
};

export const fetchLeaderboard = async () => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('amount_won', { ascending: false })
      .limit(100);

    if (error) {
      console.error("Failed to fetch leaderboard:", error);
      return [];
    }

    return data;
  } catch (error) {
    console.error("Failed to fetch leaderboard:", error);
    return [];
  }
};

export const fetchActivity = async () => {
  try {
    const { data, error } = await supabase
      .from('reveals')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) {
      console.error("Failed to fetch activity:", error);
      return [];
    }

    return data;
  } catch (error) {
    console.error("Failed to fetch activity:", error);
    return [];
  }
};

export const fetchBestFriends = async (fid: number) => {
  try {
    const response = await fetch(`/api/users/best-friends?fid=${fid}`);
    const data = await response.json();
    return data.bestFriends;
  } catch (error) {
    console.error("Failed to fetch best friends:", error);
    return [];
  }
};
