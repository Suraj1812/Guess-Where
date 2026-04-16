import {
  DRAWER_POINTS_PER_GUESSER,
  DRAW_ROUND_MS,
  FIRST_GUESS_BONUS,
  GUESS_BASE_POINTS,
  GUESS_SPEED_POINTS
} from "../../../shared/constants.js";

export const calculateGuessScore = (elapsedMs: number, correctOrder: number): number => {
  const clampedElapsed = Math.max(0, Math.min(DRAW_ROUND_MS, elapsedMs));
  const speedRatio = 1 - clampedElapsed / DRAW_ROUND_MS;
  const speedBonus = Math.round(speedRatio * GUESS_SPEED_POINTS);
  const orderBonus = Math.max(0, FIRST_GUESS_BONUS - correctOrder * 12);

  return Math.max(35, GUESS_BASE_POINTS + speedBonus + orderBonus);
};

export const calculateDrawerBonus = (correctGuessCount: number): number =>
  correctGuessCount * DRAWER_POINTS_PER_GUESSER;
