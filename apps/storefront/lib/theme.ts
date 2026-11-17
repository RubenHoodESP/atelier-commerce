import 'server-only';
import { cookies } from 'next/headers';

export type ThemeChoice = 'light' | 'dark' | 'system';
export const THEME_COOKIE = 'atelier_theme';

// Absent or invalid cookie means "follow the system preference".
export async function readTheme(): Promise<'light' | 'dark' | null> {
  const value = (await cookies()).get(THEME_COOKIE)?.value;
  return value === 'light' || value === 'dark' ? value : null;
}
