import type { HeroThemeProps } from "./hero.types";

interface ValidationErrorProps extends HeroThemeProps {
  message: string;
}

export default function ValidationError({
  isDarkMode,
  message,
}: ValidationErrorProps) {
  if (!message) return null;

  return (
    <div
      role="alert"
      className={`flex items-center gap-2 px-4 py-3 rounded-xl border mt-1 text-sm font-bold animate-pulse shadow-lg ${
        isDarkMode
          ? "bg-red-900/30 border-red-500/50 text-red-400"
          : "bg-red-100 border-red-300 text-red-700"
      }`}
    >
      <span aria-hidden="true">🛑</span>
      {message}
    </div>
  );
}
