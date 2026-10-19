import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { AuthContext } from "./AuthContext";
import {
  getCurrentUser,
  loginWithGoogle as loginRequest,
  logoutRequest,
} from "./auth.service";
import type { AuthContextValue, AuthUser } from "./auth.types";

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const queryClient = useQueryClient();

  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshDashboard = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["links"] }),
      queryClient.invalidateQueries({ queryKey: ["topLinks"] }),
    ]);
  }, [queryClient]);

  useEffect(() => {
    let active = true;

    async function loadUser() {
      try {
        const response = await getCurrentUser();

        if (active) {
          setUser(response.user);
        }
      } catch {
        if (active) {
          setUser(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadUser();

    return () => {
      active = false;
    };
  }, []);

  const loginWithGoogle = useCallback(
    async (idToken: string) => {
      setError(null);

      try {
        const response = await loginRequest(idToken);

        // Evita mostrar os dados da sessão anterior.
        queryClient.setQueryData(["links"], []);
        queryClient.setQueryData(["topLinks"], []);

        setUser(response.user);

        // Busca os dados novamente usando a sessão autenticada.
        await refreshDashboard();
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Não foi possível entrar com o Google.",
        );
      }
    },
    [queryClient, refreshDashboard],
  );

  const logout = useCallback(async () => {
    setError(null);

    try {
      await logoutRequest();

      // Limpa imediatamente os dados da conta anterior.
      queryClient.setQueryData(["links"], []);
      queryClient.setQueryData(["topLinks"], []);

      setUser(null);

      // Busca os dados que pertencem ao visitante anônimo.
      await refreshDashboard();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível encerrar a sessão.",
      );
    }
  }, [queryClient, refreshDashboard]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value: AuthContextValue = {
    user,
    loading,
    error,
    loginWithGoogle,
    logout,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
