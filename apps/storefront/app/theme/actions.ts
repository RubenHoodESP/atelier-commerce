'use server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { THEME_COOKIE } from '../../lib/theme';

// Stores an explicit light/dark choice for a year; "system" removes it. The server renders
// data-theme on <html> from this cookie, so the chosen theme is applied before first paint.
export async function setTheme(formData: FormData): Promise<void> {
  const theme = formData.get('theme');
  const store = await cookies();
  if (theme === 'light' || theme === 'dark') {
    store.set(THEME_COOKIE, theme, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 365,
      secure: process.env.NODE_ENV === 'production' });
  } else if (theme === 'system') {
    store.delete(THEME_COOKIE);
  } else {
    return;
  }
  revalidatePath('/', 'layout');
}
