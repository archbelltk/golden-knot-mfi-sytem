/** dd/mm/yy — the app-wide date display format. Native `<input type="date">` fields are exempt: the HTML spec requires their value in yyyy-mm-dd regardless of display locale. */
export function formatDate(value: string | Date): string {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

export function formatDateTime(value: string | Date): string {
  const date = new Date(value);
  const time = date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  return `${formatDate(date)}, ${time}`;
}

/** Accounting period keys are "yyyy-mm" (e.g. "2026-08") — display as mm/yy. */
export function formatPeriod(period: string): string {
  const [year, month] = period.split("-");
  return `${month}/${year.slice(2)}`;
}

/** "BACK_OFFICE" -> "Back Office" */
export function formatRole(role: string): string {
  return role
    .toLowerCase()
    .split("_")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

export function initials(role: string): string {
  const words = role.split("_");
  return words.length > 1 ? words[0][0] + words[1][0] : role.slice(0, 2);
}

export function formatMoney(amount: number, currency: string): string {
  const label = currency === "ZIG" ? "ZiG" : currency;
  return `${label} ${amount.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}
