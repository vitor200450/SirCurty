import type { ReactNode } from "react";
import mascotImage from "../../assets/SirCurtyMascot.png";

interface PreviewShellProps {
  children: ReactNode;
}

interface BadgePillProps {
  children: ReactNode;
  color: "yellow" | "blue";
}

export function PreviewShell({ children }: PreviewShellProps) {
  return (
    <div className="min-h-screen bg-[#0B0D14] text-slate-200 flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-900/20 via-[#0B0D14] to-[#0B0D14] z-0" />

      <div className="max-w-md w-full bg-[#151828]/90 backdrop-blur-sm border-2 border-purple-900/50 rounded-2xl p-8 shadow-[0_0_50px_rgba(88,28,135,0.3)] text-center relative z-10">
        <div className="flex justify-center mb-6 relative">
          <div className="absolute inset-0 bg-yellow-500/20 blur-xl rounded-full" />

          <img
            src={mascotImage}
            alt="Sir Curty Mascote"
            className="h-36 object-contain animate-bounce duration-1000 drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)] relative z-10"
          />
        </div>

        {children}
      </div>
    </div>
  );
}

export function BadgePill({ children, color }: BadgePillProps) {
  const className =
    color === "yellow"
      ? "bg-[#2A1D52] text-yellow-500 border-yellow-600/30"
      : "bg-[#1A1D2E] text-blue-400 border-blue-600/30";

  return (
    <span
      className={`${className} border text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-widest shadow-sm`}
    >
      {children}
    </span>
  );
}
