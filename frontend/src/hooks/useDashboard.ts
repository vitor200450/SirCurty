import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  deleteLink as deleteLinkRequest,
  getLinks,
  getTopLinks,
  updateLink as updateLinkRequest,
} from "../lib/api";

import type { LinkResponse, UpdateLinkBody } from "../types/link";

export function useDashboard() {
  const queryClient = useQueryClient();

  const linksQuery = useQuery<LinkResponse[]>({
    queryKey: ["links"],
    queryFn: getLinks,
    retry: false,
  });

  const topLinksQuery = useQuery<LinkResponse[]>({
    queryKey: ["topLinks"],
    queryFn: () => getTopLinks(10),
    retry: false,
  });

  const deleteMutation = useMutation({
    mutationFn: (slug: string) => deleteLinkRequest(slug),

    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["links"] }),
        queryClient.invalidateQueries({ queryKey: ["topLinks"] }),
      ]);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ slug, body }: { slug: string; body: UpdateLinkBody }) =>
      updateLinkRequest(slug, body),

    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["links"] }),
        queryClient.invalidateQueries({ queryKey: ["topLinks"] }),
      ]);
    },
  });

  return {
    links: linksQuery.data ?? [],
    isLoadingLinks: linksQuery.isLoading,
    linksError: linksQuery.error,

    topLinks: topLinksQuery.data ?? [],
    isLoadingTopLinks: topLinksQuery.isLoading,
    topLinksError: topLinksQuery.error,

    deleteLink: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
    deleteError: deleteMutation.error,

    updateLink: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
    updateError: updateMutation.error,
  };
}
