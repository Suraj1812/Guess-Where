import { CLOSE_GUESS_DISTANCE, WORD_CHOICES_PER_TURN } from "../../../shared/constants.js";
import type { WordEntry } from "../../../shared/types.js";
import wordBank from "../../../shared/words.json" with { type: "json" };

const wordsByCategory = wordBank as Record<string, string[]>;

const allWords: WordEntry[] = Object.entries(wordsByCategory).flatMap(([category, words]) =>
  words.map((text) => ({ text, category }))
);

const shuffle = <T>(items: T[]): T[] => {
  const nextItems = [...items];

  for (let index = nextItems.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [nextItems[index], nextItems[swapIndex]] = [nextItems[swapIndex], nextItems[index]];
  }

  return nextItems;
};

export const getRandomWordChoices = (exclude: string[] = []): WordEntry[] => {
  const excluded = new Set(exclude.map((word) => normalizeGuess(word)));
  return shuffle(allWords)
    .filter((entry) => !excluded.has(normalizeGuess(entry.text)))
    .slice(0, WORD_CHOICES_PER_TURN);
};

export const normalizeGuess = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const maskWord = (value: string): string =>
  value
    .split("")
    .map((character) => {
      if (character === " ") {
        return " / ";
      }

      if (character === "-") {
        return "-";
      }

      return "_";
    })
    .join(" ");

const levenshteinDistance = (left: string, right: string): number => {
  const rows = left.length + 1;
  const columns = right.length + 1;
  const grid = Array.from({ length: rows }, () => Array<number>(columns).fill(0));

  for (let row = 0; row < rows; row += 1) {
    grid[row][0] = row;
  }

  for (let column = 0; column < columns; column += 1) {
    grid[0][column] = column;
  }

  for (let row = 1; row < rows; row += 1) {
    for (let column = 1; column < columns; column += 1) {
      const cost = left[row - 1] === right[column - 1] ? 0 : 1;

      grid[row][column] = Math.min(
        grid[row - 1][column] + 1,
        grid[row][column - 1] + 1,
        grid[row - 1][column - 1] + cost
      );
    }
  }

  return grid[left.length][right.length];
};

export const isCloseGuess = (guess: string, answer: string): boolean => {
  const normalizedGuess = normalizeGuess(guess);
  const normalizedAnswer = normalizeGuess(answer);

  if (!normalizedGuess || !normalizedAnswer || normalizedGuess === normalizedAnswer) {
    return false;
  }

  return levenshteinDistance(normalizedGuess, normalizedAnswer) <= CLOSE_GUESS_DISTANCE;
};
