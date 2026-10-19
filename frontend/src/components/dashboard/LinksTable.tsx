import type { LinkResponse } from "../../types/link";

interface LinksTableProps {
  links: LinkResponse[];
  isLoading: boolean;
  isDarkMode: boolean;
  isDeleting: boolean;
  onEdit: (link: LinkResponse) => void;
  onViewStats: (slug: string) => void;
  onDelete: (slug: string) => void;
}

export default function LinksTable({
  links,
  isLoading,
  isDarkMode,
  isDeleting,
  onEdit,
  onViewStats,
  onDelete,
}: LinksTableProps) {
  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("pt-PT", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    });

  const containerClass = isDarkMode
    ? "bg-[#151828] border-[#2A2E45] shadow-black/50"
    : "bg-[#E4CE9B] border-[#C8AF73] shadow-[#E8DCC2]/50";

  const secondaryText = isDarkMode ? "text-slate-400" : "text-[#6B5A40]";

  return (
    <div
      className={`lg:col-span-2 rounded-xl p-6 border-2 shadow-lg relative min-h-[300px] flex flex-col ${containerClass}`}
    >
      <div
        className={`absolute -top-4 left-6 px-4 py-1 rounded-md border-2 font-bold text-sm flex items-center gap-2 ${
          isDarkMode
            ? "bg-[#151828] border-[#2A2E45] text-slate-300"
            : "bg-[#E4CE9B] border-[#C8AF73] text-[#5A4A32]"
        }`}
      >
        ⚜️ Links recentes
      </div>

      <div className="mt-4 overflow-x-auto flex-1">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr
              className={`border-b-2 text-sm ${
                isDarkMode
                  ? "border-[#2A2E45] text-slate-400"
                  : "border-[#A3884D] text-[#5A4A32]"
              }`}
            >
              <th className="pb-3 font-semibold w-[22%]">Link curto</th>
              <th className="pb-3 font-semibold w-[30%]">Link original</th>
              <th className="pb-3 font-semibold text-center w-[13%]">Estado</th>
              <th className="pb-3 font-semibold text-center w-[13%]">Data</th>
              <th className="pb-3 font-semibold text-center w-[22%]">Ações</th>
            </tr>
          </thead>

          <tbody
            className={`text-sm ${isDarkMode ? "text-slate-300" : "text-[#4A3D22]"}`}
          >
            {isLoading ? (
              <tr>
                <td colSpan={5} className="py-16 text-center">
                  <div
                    className={`flex flex-col items-center gap-2 opacity-70 ${secondaryText}`}
                  >
                    <span className="text-3xl animate-spin">⚙️</span>
                    <p className="text-sm">A consultar o castelo...</p>
                  </div>
                </td>
              </tr>
            ) : links.length > 0 ? (
              links.map((link) => (
                <tr
                  key={link.id}
                  className={`border-b border-dashed transition-colors ${
                    isDarkMode
                      ? "border-[#2A2E45] hover:bg-[#1A1D2E]"
                      : "border-[#C8AF73] hover:bg-[#D9C490]"
                  }`}
                >
                  <td className="py-3">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={
                          isDarkMode ? "text-slate-500" : "text-[#8C7A5B]"
                        }
                      >
                        🔗
                      </span>

                      <a
                        href={`/s/${encodeURIComponent(link.slug)}`}
                        target="_blank"
                        rel="noreferrer"
                        className={`font-semibold hover:underline truncate max-w-[90px] ${
                          isDarkMode ? "text-purple-400" : "text-[#3B2A6B]"
                        }`}
                      >
                        {link.slug}
                      </a>

                      {link.hasPassword && (
                        <span title="Com senha" className="text-xs">
                          🔒
                        </span>
                      )}

                      {link.isSingleUse && (
                        <span title="Uso único" className="text-xs">
                          🔥
                        </span>
                      )}
                    </div>
                  </td>

                  <td
                    className="py-3 truncate max-w-[180px]"
                    title={link.originalUrl}
                  >
                    {link.originalUrl}
                  </td>

                  <td className="py-3 text-center">
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        link.status === "ACTIVE"
                          ? isDarkMode
                            ? "bg-green-900/40 text-green-400"
                            : "bg-green-100 text-green-700"
                          : isDarkMode
                            ? "bg-red-900/40 text-red-400"
                            : "bg-red-100 text-red-700"
                      }`}
                    >
                      {link.status === "ACTIVE"
                        ? "Ativo"
                        : link.status === "DISABLED"
                          ? "Inativo"
                          : link.status}
                    </span>
                  </td>

                  <td className="py-3 text-center">
                    {formatDate(link.createdAt)}
                  </td>

                  <td className="py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => onViewStats(link.slug)}
                        title="Ver estatísticas"
                        aria-label={`Ver estatísticas de ${link.slug}`}
                        className={`p-1.5 rounded-lg transition-all text-sm ${
                          isDarkMode
                            ? "hover:bg-purple-900/40 text-slate-400 hover:text-purple-400"
                            : "hover:bg-purple-100 text-[#8C7A5B] hover:text-purple-600"
                        }`}
                      >
                        📊
                      </button>

                      <button
                        type="button"
                        onClick={() => onEdit(link)}
                        title="Editar pergaminho"
                        aria-label={`Editar ${link.slug}`}
                        className={`p-1.5 rounded-lg transition-all text-sm ${
                          isDarkMode
                            ? "hover:bg-blue-900/40 text-slate-400 hover:text-blue-400"
                            : "hover:bg-blue-100 text-[#8C7A5B] hover:text-blue-600"
                        }`}
                      >
                        ✏️
                      </button>

                      <button
                        type="button"
                        onClick={() => onDelete(link.slug)}
                        disabled={isDeleting}
                        title="Queimar pergaminho"
                        aria-label={`Excluir ${link.slug}`}
                        className={`p-1.5 rounded-lg transition-all text-sm disabled:opacity-50 ${
                          isDarkMode
                            ? "hover:bg-red-900/40 text-slate-400 hover:text-red-400"
                            : "hover:bg-red-200 text-[#8C7A5B] hover:text-red-600"
                        }`}
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="py-16 text-center">
                  <div
                    className={`flex flex-col items-center justify-center gap-2 opacity-70 ${secondaryText}`}
                  >
                    <span className="text-4xl drop-shadow-sm mb-2">📜</span>
                    <p
                      className={`font-bold text-base ${isDarkMode ? "text-slate-400" : "text-[#5A4A32]"}`}
                    >
                      Nenhum pergaminho criado.
                    </p>
                    <p
                      className={`text-xs ${isDarkMode ? "text-slate-500" : "text-[#5A4A32]/80"}`}
                    >
                      Encurta o teu primeiro link ali em cima para registares os
                      teus passos!
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
