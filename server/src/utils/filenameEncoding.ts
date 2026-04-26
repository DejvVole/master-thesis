export function normalizePossibleMojibake(value: string): string {
  try {
    const decoded = Buffer.from(value, "latin1").toString("utf8");
    const roundTrip = Buffer.from(decoded, "utf8").toString("latin1");

    return roundTrip === value ? decoded : value;
  } catch {
    return value;
  }
}
