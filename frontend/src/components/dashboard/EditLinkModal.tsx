import { useState } from "react";
import type { FormEvent } from "react";
import type { LinkResponse, UpdateLinkBody } from "../../types/link";

interface EditLinkModalProps {
  link: LinkResponse;
  isDarkMode: boolean;
  isSaving: boolean;
  saveError: string | null;
  onClose: () => void;
  onSave: (slug: string, body: UpdateLinkBody) => void;
}

export default function EditLinkModal({
  link,
  isDarkMode,
  isSaving,
  saveError,
  onClose,
  onSave,
}: EditLinkModalProps) {
  const [url, setUrl] = useState(link.originalUrl);
  const [expiresAt, setExpiresAt] = useState(
    link.expiresAt ? new Date(link.expiresAt).toISOString().slice(0, 16) : "",
  );
  const [singleUse, setSingleUse] = useState(link.isSingleUse);
  const [status, setStatus] = useState<"ACTIVE" | "DISABLED">(
    link.status === "ACTIVE" ? "ACTIVE" : "DISABLED",
  );

  const inputClass = `w-full rounded-xl px-3 py-2 text-sm outline-none border transition-colors ${
    isDarkMode
      ? "bg-[#0B0D14] border-slate-700 text-white focus:border-purple-500"
      : "bg-white border-[#D4BC8C] text-[#4E3629] focus:border-[#3B2A6B]"
  }`;

  const labelClass = `text-xs font-bold uppercase tracking-wider mb-1 block ${
    isDarkMode ? "text-slate-400" : "text-[#6B5A40]"
  }`;

  function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const body: UpdateLinkBody = {};

    if (url !== link.originalUrl) {
      body.url = url;
    }

    if (singleUse !== link.isSingleUse) {
      body.singleUse = singleUse;
    }

    const originalStatus = link.status === "ACTIVE" ? "ACTIVE" : "DISABLED";

    if (status !== originalStatus) {
      body.status = status;
    }

    const newExpiry = expiresAt ? new Date(expiresAt).toISOString() : null;

    const oldExpiry = link.expiresAt
      ? new Date(link.expiresAt).toISOString()
      : null;

    if (newExpiry !== oldExpiry) {
      body.expiresAt = newExpiry;
    }

    if (Object.keys(body).length === 0) {
      onClose();
      return;
    }

    onSave(link.slug, body);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div
        className={`w-full max-w-md rounded-2xl border-2 shadow-2xl p-6 ${
          isDarkMode
            ? "bg-[#151828] border-[#2A2E45]"
            : "bg-[#FDF8EE] border-[#C8AF73]"
        }`}
      >
        <div className="flex items-center justify-between mb-6">
          <h2
            className={`font-bold text-lg ${
              isDarkMode ? "text-white" : "text-[#3A3022]"
            }`}
          >
            ✏️ Editar Pergaminho
          </h2>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar edição"
            className={`p-1.5 rounded-lg transition-colors ${
              isDarkMode
                ? "hover:bg-slate-700 text-slate-400"
                : "hover:bg-[#E4CE9B] text-[#6B5A40]"
            }`}
          >
            ✕
          </button>
        </div>

        <p
          className={`text-xs mb-4 font-mono ${
            isDarkMode ? "text-purple-400" : "text-[#3B2A6B]"
          }`}
        >
          /{link.slug}
        </p>

        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <div>
            <label className={labelClass}>🔗 URL destino</label>
            <input
              type="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              className={inputClass}
              required
            />
          </div>

          <div>
            <label className={labelClass}>⏳ Expiração (opcional)</label>
            <input
              type="datetime-local"
              value={expiresAt}
              onChange={(event) => setExpiresAt(event.target.value)}
              className={inputClass}
            />

            {expiresAt && (
              <button
                type="button"
                onClick={() => setExpiresAt("")}
                className="text-xs text-red-400 mt-1 hover:underline"
              >
                Remover expiração
              </button>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={singleUse}
                onChange={(event) => setSingleUse(event.target.checked)}
                className="w-4 h-4 accent-orange-500 cursor-pointer"
              />
              <span
                className={`text-sm font-bold ${
                  isDarkMode ? "text-orange-300" : "text-[#4E3629]"
                }`}
              >
                🔥 Uso único
              </span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={status === "ACTIVE"}
                onChange={(event) =>
                  setStatus(event.target.checked ? "ACTIVE" : "DISABLED")
                }
                className="w-4 h-4 accent-green-500 cursor-pointer"
              />
              <span
                className={`text-sm font-bold ${
                  isDarkMode ? "text-green-300" : "text-[#4E3629]"
                }`}
              >
                ✅ Ativo (desmarcar para desativar)
              </span>
            </label>
          </div>

          {saveError && (
            <p
              role="alert"
              className="text-red-400 text-xs font-bold bg-red-900/20 rounded-lg px-3 py-2"
            >
              🛑 {saveError}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-colors ${
                isDarkMode
                  ? "bg-slate-700 hover:bg-slate-600 text-slate-200"
                  : "bg-[#E4CE9B] hover:bg-[#D9C490] text-[#4E3629]"
              }`}
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 py-2.5 rounded-xl font-bold text-sm bg-purple-600 hover:bg-purple-500 disabled:opacity-60 text-white transition-colors"
            >
              {isSaving ? "A guardar..." : "⚔️ Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
