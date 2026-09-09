const easternDate = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  dateStyle: "medium",
});

const easternTime = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  timeStyle: "short",
});

export function formatEasternDate(value: string): string {
  return easternDate.format(new Date(value));
}

export function formatEasternTime(value: string): string {
  return easternTime.format(new Date(value));
}
