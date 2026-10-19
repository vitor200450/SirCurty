import { useState } from "react";
import EditLinkModal from "./dashboard/EditLinkModal";
import LinkStatsModal from "./dashboard/LinkStatsModal";
import LinksTable from "./dashboard/LinksTable";
import DashboardOverview from "./dashboard/DashboardOverview";
import { useDashboard } from "../hooks/useDashboard";
import type { LinkResponse, UpdateLinkBody } from "../types/link";
import ConfirmModal from "./dashboard/ConfirmModal";

interface DashboardProps {
  isDarkMode: boolean;
}

export default function Dashboard({ isDarkMode }: DashboardProps) {
  const [editingLink, setEditingLink] = useState<LinkResponse | null>(null);
  const [statsSlug, setStatsSlug] = useState<string | null>(null);
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null);

  const {
    links,
    isLoadingLinks,
    topLinks,
    deleteLink,
    isDeleting,
    updateLink,
    isUpdating,
    updateError,
  } = useDashboard();

  function handleDelete(slug: string) {
    setDeletingSlug(slug);
  }

  function handleConfirmDelete() {
    if (!deletingSlug || isDeleting) return;

    deleteLink(deletingSlug, {
      onSuccess: () => {
        setDeletingSlug(null);
      },
    });
  }

  function handleSave(slug: string, body: UpdateLinkBody) {
    updateLink(
      { slug, body },
      {
        onSuccess: () => {
          setEditingLink(null);
        },
      },
    );
  }

  const saveError =
    updateError instanceof Error
      ? updateError.message
      : updateError
        ? "Não foi possível atualizar o link."
        : null;

  return (
    <>
      {editingLink && (
        <EditLinkModal
          link={editingLink}
          isDarkMode={isDarkMode}
          isSaving={isUpdating}
          saveError={saveError}
          onClose={() => setEditingLink(null)}
          onSave={handleSave}
        />
      )}

      {statsSlug && (
        <LinkStatsModal
          slug={statsSlug}
          isDarkMode={isDarkMode}
          onClose={() => setStatsSlug(null)}
        />
      )}

      {deletingSlug !== null && (
        <ConfirmModal
          isDarkMode={isDarkMode}
          isLoading={isDeleting}
          title="Excluir este link?"
          message="Esta ação é permanente. O link deixará de estar disponível para acesso."
          itemName={deletingSlug}
          confirmLabel="Excluir link"
          onClose={() => setDeletingSlug(null)}
          onConfirm={handleConfirmDelete}
        />
      )}

      <section className="max-w-7xl mx-auto px-8 pb-20 mt-12">
        <div className="grid lg:grid-cols-3 gap-8 items-start">
          <LinksTable
            links={links}
            isLoading={isLoadingLinks}
            isDarkMode={isDarkMode}
            isDeleting={isDeleting}
            onEdit={setEditingLink}
            onViewStats={setStatsSlug}
            onDelete={handleDelete}
          />

          <DashboardOverview
            links={links}
            topLinks={topLinks}
            isDarkMode={isDarkMode}
            onViewStats={setStatsSlug}
          />
        </div>

        <div className="mt-12 text-center">
          <div
            className={`inline-block px-8 py-3 rounded-full font-medium shadow-md ${
              isDarkMode
                ? "bg-[#2A1D52] text-slate-300 border border-[#3B2A6B]"
                : "bg-[#3B2A6B] text-[#FAF3E0]"
            }`}
          >
            Seja um cavaleiro da internet. Encurte, partilhe e conquiste!
          </div>
        </div>
      </section>
    </>
  );
}
