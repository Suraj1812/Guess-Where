import { BASE_POINTS, FAST_BONUS_POINTS, ROUND_GUESS_MS } from "../../../shared/constants.js";

export const calculateGuessPoints = (answerTimeMs: number): number => {
  const normalizedTime = Math.max(0, Math.min(ROUND_GUESS_MS, answerTimeMs));
  const speedBonus = Math.round((1 - normalizedTime / ROUND_GUESS_MS) * FAST_BONUS_POINTS);

  return BASE_POINTS + speedBonus;
};
