// Curaçao Airports — for Digital Immigration Card form
// Curaçao main airport + OTHER option

export const drAirports = [
  { code: "CUR", name: "Curaçao - Hato International (CUR)" },
  { code: "XXX", name: "Other" },
] as const;

export type DRAirport = typeof drAirports[number];
