'use client';
import { setTheme } from '../app/theme/actions';

type Choice = 'system' | 'light' | 'dark';
const CHOICES: { value: Choice; label: string }[] = [
  { value: 'system', label: 'Auto' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' },
];

// Native form + Server Action: works without JavaScript (the server re-renders with the cookie).
// With JavaScript the new theme is applied immediately, before the server round trip.
export function ThemeSwitch({ theme }: { theme: Choice }) {
  function preview(choice: Choice) {
    if (choice === 'system') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = choice;
  }
  return (
    <form action={setTheme}>
      <fieldset className="-mx-2 flex items-center gap-1 text-xs">
        <legend className="sr-only">Colour theme</legend>
        {CHOICES.map(choice => (
          <button key={choice.value} type="submit" name="theme" value={choice.value} aria-pressed={theme === choice.value}
            onClick={() => preview(choice.value)}
            className="min-h-6 min-w-6 px-2 py-1 text-muted underline-offset-4 aria-pressed:text-ink aria-pressed:underline">
            {choice.label}<span className="sr-only"> theme</span>
          </button>
        ))}
      </fieldset>
    </form>
  );
}
