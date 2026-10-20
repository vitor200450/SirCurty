import { useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { useAuth } from "../features/auth/useAuth";
import logoUrl from "../assets/sircurty-logo.png";

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
      <img
        src={logoUrl}
        alt=""
        className="h-10 w-auto shrink-0 drop-shadow-md -translate-y-[2px]"
      />

      <div>
        <h1
          className={`text-2xl font-bold tracking-tight leading-none ${
            isDarkMode ? "text-white" : "text-[#1F1B38]"
          }`}
        >
          Sir Curty
        </h1>

        <p
          className={`text-xs uppercase tracking-widest mt-1.5 font-medium ${
            isDarkMode ? "text-slate-400" : "text-[#4E3629]/80"
          }`}
        >
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
  const { user, loading, error, loginWithGoogle, logout, clearError } =
    useAuth();

  const [googleError, setGoogleError] = useState<string | null>(null);

  if (loading) {
    return <div className="h-10 w-32" aria-label="Carregando autenticação" />;
  }

  if (user) {
    return (
      <div className="flex items-center gap-3">
        <span className="max-w-40 truncate text-sm" title={user.email}>
          {user.name || user.email}
        </span>

        <button
          type="button"
          onClick={() => void logout()}
          className="rounded-lg border border-current px-3 py-2 text-sm"
        >
          Sair
        </button>

        {error && (
          <span role="alert" className="text-sm text-red-500">
            {error}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <GoogleLogin
        theme={isDarkMode ? "filled_black" : "outline"}
        size="large"
        shape="pill"
        text="signin_with"
        onSuccess={(credentialResponse) => {
          setGoogleError(null);
          clearError();

          if (!credentialResponse.credential) {
            setGoogleError("O Google não retornou um ID token.");
            return;
          }

          void loginWithGoogle(credentialResponse.credential);
        }}
        onError={() => {
          setGoogleError("Não foi possível iniciar o login com Google.");
        }}
      />

      {(error || googleError) && (
        <span role="alert" className="max-w-64 text-sm text-red-500">
          {error || googleError}
        </span>
      )}
    </div>
  );
}

export default function Navbar({ isDarkMode, toggleTheme }: NavbarProps) {
  return (
    <header className="absolute top-0 inset-x-0 z-50">
      <div className="flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
        <Brand isDarkMode={isDarkMode} />

        <Navigation isDarkMode={isDarkMode} />

        <div className="flex items-center gap-4">
          <ThemeButton isDarkMode={isDarkMode} onToggle={toggleTheme} />

          <AccountActions isDarkMode={isDarkMode} />
        </div>
      </div>
    </header>
  );
}
