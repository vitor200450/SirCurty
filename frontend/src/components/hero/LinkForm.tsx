import type { FormEventHandler, ReactNode } from "react";
import type { HeroThemeProps } from "./hero.types";

interface LinkFormProps extends HeroThemeProps {
  linkInput: string;
  setLinkInput: (value: string) => void;
  handleEncurtar: FormEventHandler<HTMLFormElement>;
  isLoading: boolean;
  children: ReactNode;
}

export default function LinkForm({
  isDarkMode,
  linkInput,
  setLinkInput,
  handleEncurtar,
  isLoading,
  children,
}: LinkFormProps) {
  return (
    <form
      onSubmit={handleEncurtar}
      noValidate
      className="flex flex-col gap-3 mt-6"
    >
      <div
        className={`backdrop-blur-md p-2 rounded-2xl border flex items-center gap-3 transition-colors ${
          isDarkMode
            ? "bg-[#1D172A]/90 border-purple-900/60 shadow-[0_4px_30px_rgba(88,28,135,0.15)]"
            : "bg-[#FAF3E0] border-[#E5D5B3] shadow-[0_4px_25px_rgba(139,94,26,0.12)]"
        }`}
      >
        <span
          className={`pl-4 text-xl ${
            isDarkMode ? "text-purple-300/80" : "text-[#8B5E34]/70"
          }`}
          aria-hidden="true"
        >
          🔗
        </span>

        <input
          type="text"
          value={linkInput}
          onChange={(event) => setLinkInput(event.target.value)}
          placeholder="Cole o seu link longo aqui..."
          aria-label="Link longo para encurtar"
          className={`flex-1 min-w-0 bg-transparent outline-none py-3 text-base font-medium ${
            isDarkMode
              ? "text-purple-100 placeholder-purple-300/60"
              : "text-[#4E3629] placeholder-[#8B5E34]/60"
          }`}
        />

        <button
          type="submit"
          disabled={isLoading}
          className={`px-6 py-3.5 rounded-xl font-medium flex items-center gap-2 shadow-lg transition-all cursor-pointer text-base disabled:opacity-70 ${
            isDarkMode
              ? "bg-purple-600 hover:bg-purple-500 text-white"
              : "bg-[#4B3B88] hover:bg-[#3B2A6B] text-white"
          }`}
        >
          <span
            className={`inline-block origin-bottom-left ${isLoading ? "animate-slice" : ""}`}
          >
            🗡️
          </span>
          {isLoading ? "A Cortar..." : "Encurtar"}
        </button>
      </div>

      {children}
    </form>
  );
}
