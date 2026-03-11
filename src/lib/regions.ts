export type Region = "australia" | "europe" | "uk_irl" | "north_america" | "other";

export const REGION_MAP: Record<string, Region> = {
  AU: "australia",
  NZ: "australia",
  GB: "uk_irl",
  IE: "uk_irl",
  US: "north_america",
  CA: "north_america",
  DE: "europe",
  FR: "europe",
  NL: "europe",
  DK: "europe",
  SE: "europe",
  NO: "europe",
  FI: "europe",
  ES: "europe",
  PT: "europe",
  IT: "europe",
  BE: "europe",
  CH: "europe",
  AT: "europe",
  PL: "europe",
  GR: "europe",
  HR: "europe",
  CZ: "europe",
  HU: "europe",
  SK: "europe",
  SI: "europe",
  RO: "europe",
  BG: "europe",
  EE: "europe",
  LV: "europe",
  LT: "europe",
  LU: "europe",
  MT: "europe",
  CY: "europe",
};

export const REGION_LABELS: Record<Region, string> = {
  australia: "Australia & NZ",
  europe: "Europe",
  uk_irl: "UK & Ireland",
  north_america: "North America",
  other: "Other",
};

export function getRegion(countryCode: string): Region {
  return REGION_MAP[countryCode] ?? "other";
}

export function getCountriesForRegion(region: Region): string[] {
  return Object.entries(REGION_MAP)
    .filter(([, r]) => r === region)
    .map(([c]) => c);
}

export const COUNTRY_NAMES: Record<string, string> = {
  AU: "Australia",
  NZ: "New Zealand",
  GB: "United Kingdom",
  IE: "Ireland",
  US: "United States",
  CA: "Canada",
  DE: "Germany",
  FR: "France",
  NL: "Netherlands",
  DK: "Denmark",
  SE: "Sweden",
  NO: "Norway",
  FI: "Finland",
  ES: "Spain",
  PT: "Portugal",
  IT: "Italy",
  BE: "Belgium",
  CH: "Switzerland",
  AT: "Austria",
  PL: "Poland",
  GR: "Greece",
  HR: "Croatia",
  CZ: "Czech Republic",
  HU: "Hungary",
  SK: "Slovakia",
  SI: "Slovenia",
  RO: "Romania",
  BG: "Bulgaria",
  EE: "Estonia",
  LV: "Latvia",
  LT: "Lithuania",
  LU: "Luxembourg",
  MT: "Malta",
  CY: "Cyprus",
  JP: "Japan",
  ZA: "South Africa",
  BR: "Brazil",
  AR: "Argentina",
};
