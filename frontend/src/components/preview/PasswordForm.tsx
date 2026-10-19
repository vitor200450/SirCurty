interface PasswordFormProps {
  isSingleUse: boolean;
  password: string;
  error: string | null;
  isSubmitting: boolean;
  onPasswordChange: (password: string) => void;
  onSubmit: () => void;
}

export function PasswordForm({
  isSingleUse,
  password,
  error,
  isSubmitting,
  onPasswordChange,
  onSubmit,
}: PasswordFormProps) {
  return (
    <>
      <h2 className="text-2xl font-extrabold text-white mt-5 mb-2">
        Pergaminho Protegido!
      </h2>

      <p className="text-sm text-slate-300 leading-relaxed mb-6">
        Este link está protegido com senha. Insere a chave para abrir os
        portões.
      </p>

      {isSingleUse && (
        <p className="text-xs text-orange-400 font-bold mb-4">
          🔥 Atenção: este pergaminho será destruído após a primeira leitura!
        </p>
      )}

      <form
        onSubmit={(event) => {
          event.preventDefault();

          if (password.trim() && !isSubmitting) {
            onSubmit();
          }
        }}
        className="flex flex-col gap-3"
      >
        <input
          type="password"
          value={password}
          onChange={(event) => onPasswordChange(event.target.value)}
          placeholder="🔑 Senha secreta..."
          autoFocus
          autoComplete="current-password"
          disabled={isSubmitting}
          className="w-full bg-[#0B0D14] border border-slate-700 text-white rounded-xl px-4 py-3 text-sm outline-none focus:border-purple-500 transition-colors disabled:opacity-60"
        />

        {error && (
          <p role="alert" className="text-red-400 text-xs font-bold">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting || !password.trim()}
          className="px-6 py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-60 text-white rounded-xl font-bold transition-all"
        >
          {isSubmitting ? "A verificar..." : "⚔️ Abrir Portões"}
        </button>
      </form>
    </>
  );
}
