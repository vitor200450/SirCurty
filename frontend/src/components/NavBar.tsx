interface NavbarProps {
  isDarkMode: boolean;
  toggleTheme: () => void;
}

interface ThemeButtonProps {
  isDarkMode: boolean;
  onToggle: () => void;
}

function Brand({ isDarkMode }: Pick<NavbarProps, "isDarkMode">) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`w-10 h-12 rounded-b-2xl rounded-t-sm flex items-center justify-center text-yellow-500 shadow-md ${
          isDarkMode ? "bg-[#2A1D52]" : "bg-[#3B2A6B]"
        }`}
        aria-hidden="true"
      >
        🛡️
      </div>

      <div>
        <h1
          className={`text-2xl font-bold tracking-tight leading-none ${
            isDarkMode ? "text-white" : "text-[#1F1B38]"
          }`}
        >
          Sir Curty
        </h1>

        <p className="text-[10px] uppercase tracking-widest text-slate-500 mt-1">
          O encurtador de links
        </p>
      </div>
    </div>
  );
}

function Navigation({ isDarkMode }: Pick<NavbarProps, "isDarkMode">) {
  return (
    <nav
      className="hidden md:flex gap-8 font-medium"
      aria-label="Navegação principal"
    >
      <a
        href="#"
        aria-current="page"
        className={`pb-1 border-b-2 ${
          isDarkMode
            ? "text-purple-400 border-purple-400"
            : "text-[#3B2A6B] border-[#3B2A6B]"
        }`}
      >
        Início
      </a>
    </nav>
  );
}

function ThemeButton({ isDarkMode, onToggle }: ThemeButtonProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label="Alternar modo de cores"
      title="Alternar Modo Noturno / Diurno"
      className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
        isDarkMode
          ? "bg-slate-800 border-slate-700 text-yellow-400 hover:bg-slate-700"
          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100 shadow-sm"
      }`}
    >
      {isDarkMode ? "☀️" : "🌙"}
    </button>
  );
}

function AccountActions({ isDarkMode }: Pick<NavbarProps, "isDarkMode">) {
  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        className={`font-medium transition-colors ${
          isDarkMode
            ? "text-slate-300 hover:text-white"
            : "text-slate-700 hover:text-[#3B2A6B]"
        }`}
      >
        Entrar
      </button>

      <button
        type="button"
        className={`px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 shadow-lg transition-all cursor-pointer ${
          isDarkMode
            ? "bg-purple-600 hover:bg-purple-500 text-white shadow-purple-900/30"
            : "bg-[#3B2A6B] hover:bg-[#2A1D52] text-white shadow-indigo-900/20"
        }`}
      >
        <span className="text-yellow-400" aria-hidden="true">
          👑
        </span>
        Criar conta
      </button>
    </div>
  );
}

export default function Navbar({ isDarkMode, toggleTheme }: NavbarProps) {
  return (
    <header className="flex items-center justify-between px-8 py-6 max-w-7xl mx-auto z-50 relative">
      <Brand isDarkMode={isDarkMode} />

      <Navigation isDarkMode={isDarkMode} />

      <div className="flex items-center gap-4">
        <ThemeButton isDarkMode={isDarkMode} onToggle={toggleTheme} />

        <AccountActions isDarkMode={isDarkMode} />
      </div>
    </header>
  );
}
