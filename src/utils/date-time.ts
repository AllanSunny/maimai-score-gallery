const easternDateTime = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  dateStyle: "medium",
  timeStyle: "short",
});

export function formatEasternDateTime(value: string): string {
  return easternDateTime.format(new Date(value));
}
