// Fetch user info when wallet connects
export const fetchUserInfo = async (userWallet: string) => {
  if (!userWallet) return;

  try {
    const response = await fetch(`/api/users/get?userWallet=${userWallet}`);
    const data = await response.json();
    if (data.success && data.user) {
      return data.user;
    }
    return {};
  } catch (error) {
    console.error("Failed to fetch user info:", error);
    return {}; // Return empty object instead of throwing
  }
};

// Fetch user reveals when wallet connects
export const fetchUserReveals = async (userWallet: string) => {
  if (!userWallet) return;

  try {
    const response = await fetch(`/api/users/reveals?userWallet=${userWallet}`);
    const data = await response.json();
    if (data.success) {
      return data.reveals;
    }
    return [];
  } catch (error) {
    console.error("Failed to fetch user reveals:", error);
    return []; // Return empty array instead of throwing
  }
};

// Fetch user cards when wallet connects
export const fetchUserCards = async (userWallet: string) => {
  if (!userWallet) return;

  try {
    const response = await fetch(`/api/cards/user?userWallet=${userWallet}`);
    const data = await response.json();
    if (data.success) {
      return data.cards;
    } else {
      console.error("Failed to fetch user cards:", data.error);
      return [];
    }
  } catch (error) {
    console.error("Failed to fetch user cards:", error);
    return []; // Return empty array instead of throwing
  }
};

// Fetch app stats
export const fetchAppStats = async () => {
  try {
    const response = await fetch(`/api/stats`);
    const data = await response.json();
    return data.stats;
  } catch (error) {
    console.error("Failed to fetch app stats:", error);
    return {};
  }
};
