import type { HeroThemeProps } from "./hero.types";

export default function HeroIntro({ isDarkMode }: HeroThemeProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-yellow-600 justify-start">
        <span className="w-12 h-[2px] bg-yellow-600" />
        <span className="text-base">⚜️</span>
        <span className="w-12 h-[2px] bg-yellow-600" />
      </div>

      <h2
        className={`text-4xl md:text-5xl font-extrabold leading-tight ${
          isDarkMode ? "text-white" : "text-[#1F1B38]"
        }`}
      >
        Encurte seus links <br />
        com estilo{" "}
        <span className={isDarkMode ? "text-purple-400" : "text-[#4B3B88]"}>
          épico.
        </span>
      </h2>

      <p
        className={`text-base md:text-lg max-w-md leading-relaxed font-medium ${
          isDarkMode ? "text-slate-200" : "text-slate-700"
        }`}
      >
        Transforme links longos em curtos e poderosos. Rápido, seguro e feito
        para conquistar.
      </p>
    </div>
  );
}
