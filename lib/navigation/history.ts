/** Whether client-side router.back() is safe for the current entry. */
export function canUseBrowserHistory(
  historyLength: number,
  referrer: string,
  origin: string,
): boolean {
  if (historyLength <= 1) return false;
  if (!referrer) return true;
  try {
    return new URL(referrer).origin === origin;
  } catch {
    return false;
  }
}
