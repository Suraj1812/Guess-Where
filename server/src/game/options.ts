import { COUNTRIES, type Country } from "../../../shared/countries.js";

const shuffle = <T>(items: T[]): T[] => {
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }

  return copy;
};

export const buildCountryOptions = (correctCountry: Country): Country[] => {
  const distractors = shuffle(
    COUNTRIES.filter((country) => country.code !== correctCountry.code)
  ).slice(0, 3);

  return shuffle([correctCountry, ...distractors]);
};
