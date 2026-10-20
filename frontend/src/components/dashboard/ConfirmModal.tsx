interface ConfirmModalProps {
  isDarkMode: boolean;
  isLoading?: boolean;
  title: string;
  message: string;
  itemName?: string;
  confirmLabel?: string;
  onClose: () => void;
  onConfirm: () => void;
}

export default function ConfirmModal({
  isDarkMode,
  isLoading = false,
  title,
  message,
  itemName,
  confirmLabel = "Confirmar",
  onClose,
  onConfirm,
}: ConfirmModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isLoading) {
          onClose();
        }
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        aria-describedby="confirm-modal-description"
        className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl ${
          isDarkMode
            ? "bg-slate-900 border-slate-700 text-slate-100"
            : "bg-[#FFF9ED] border-[#D8C5A3] text-[#493824]"
        }`}
      >
        <div className="flex items-start gap-4">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl ${
              isDarkMode ? "bg-red-950/70" : "bg-red-100"
            }`}
            aria-hidden="true"
          >
            🗑️
          </div>

          <div className="min-w-0 flex-1">
            <h2 id="confirm-modal-title" className="text-lg font-bold">
              {title}
            </h2>

            <p
              id="confirm-modal-description"
              className={`mt-2 text-sm ${
                isDarkMode ? "text-slate-400" : "text-[#8C7A5B]"
              }`}
            >
              {message}
            </p>

            {itemName && (
              <p
                className={`mt-3 break-all rounded-lg px-3 py-2 text-sm font-medium ${
                  isDarkMode
                    ? "bg-slate-800 text-slate-200"
                    : "bg-[#F2E7D3] text-[#493824]"
                }`}
              >
                {itemName}
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
              isDarkMode
                ? "bg-slate-800 text-slate-200 hover:bg-slate-700"
                : "bg-[#E9DDC8] text-[#493824] hover:bg-[#DFCFB3]"
            }`}
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? "Excluindo..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
