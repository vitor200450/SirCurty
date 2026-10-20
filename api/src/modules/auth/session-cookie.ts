export const SESSION_COOKIE_NAME = 'sircurty_session';

export function getCookie(
  header: string | undefined,
  name: string,
): string | null {
  if (!header) return null;

  for (const part of header.split(';')) {
    const separator = part.indexOf('=');
    if (separator === -1) continue;

    const key = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();

    if (key === name && value.length > 0) {
      return value;
    }
  }

  return null;
}
