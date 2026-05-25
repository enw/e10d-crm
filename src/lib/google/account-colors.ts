export type AccountSource = {
  id: string;
  email: string;
};

export type AccountColorSet = {
  main: string;
  container: string;
  onContainer: string;
};

/** Distinct hues that read on e10d cream / charcoal backgrounds */
const LIGHT_PALETTE: AccountColorSet[] = [
  { main: "#b85a3a", container: "#f5ebe6", onContainer: "#5c2e1e" },
  { main: "#5a7a6b", container: "#e8f0ec", onContainer: "#2d4038" },
  { main: "#4a6fa5", container: "#e6eef7", onContainer: "#253a57" },
  { main: "#9a7b4f", container: "#f3ede3", onContainer: "#4d3e28" },
  { main: "#7a5a8a", container: "#f0e8f3", onContainer: "#3d2d45" },
  { main: "#3a8a8a", container: "#e3f0f0", onContainer: "#1d4545" },
];

const DARK_PALETTE: AccountColorSet[] = [
  { main: "#d4755a", container: "#3d2a22", onContainer: "#f5ddd4" },
  { main: "#7a9e8f", container: "#243028", onContainer: "#dce8e2" },
  { main: "#6a94c4", container: "#243040", onContainer: "#d4e2f0" },
  { main: "#b89860", container: "#342c1e", onContainer: "#efe6d4" },
  { main: "#a07ab0", container: "#302438", onContainer: "#eadcf0" },
  { main: "#5ab0b0", container: "#1e3434", onContainer: "#d4ecec" },
];

export function sortAccountSources(accounts: AccountSource[]): AccountSource[] {
  return [...accounts].sort((a, b) => a.email.localeCompare(b.email));
}

export function getAccountColorIndex(
  accountId: string,
  orderedAccounts: AccountSource[],
): number {
  const index = orderedAccounts.findIndex((account) => account.id === accountId);
  if (index >= 0) {
    return index;
  }

  let hash = 0;
  for (let i = 0; i < accountId.length; i += 1) {
    hash = (hash * 31 + accountId.charCodeAt(i)) >>> 0;
  }
  return hash % LIGHT_PALETTE.length;
}

export function getAccountColors(
  accountId: string,
  orderedAccounts: AccountSource[],
  isDark: boolean,
): AccountColorSet {
  const palette = isDark ? DARK_PALETTE : LIGHT_PALETTE;
  const index = getAccountColorIndex(accountId, orderedAccounts);
  return palette[index % palette.length]!;
}

export function getAccountMainColor(
  accountId: string,
  orderedAccounts: AccountSource[],
  isDark: boolean,
): string {
  return getAccountColors(accountId, orderedAccounts, isDark).main;
}

export function buildScheduleXCalendars(
  accounts: AccountSource[],
): Record<
  string,
  {
    colorName: string;
    label: string;
    lightColors: AccountColorSet;
    darkColors: AccountColorSet;
  }
> {
  const ordered = sortAccountSources(accounts);
  return Object.fromEntries(
    ordered.map((account) => [
      account.id,
      {
        colorName: account.id,
        label: account.email,
        lightColors: getAccountColors(account.id, ordered, false),
        darkColors: getAccountColors(account.id, ordered, true),
      },
    ]),
  );
}
