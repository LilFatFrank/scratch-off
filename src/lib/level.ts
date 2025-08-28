// Level calculation functions
export function getLevelRequirement(level: number): number {
  return Math.floor(10 * level + 5 * (level / 2));
}

export function getRevealsToNextLevel(currentLevel: number): number {
  const nextLevel = currentLevel + 1;
  return getLevelRequirement(nextLevel);
}
