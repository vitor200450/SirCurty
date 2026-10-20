export interface AuthUser {
  id: number;
  email: string;
  name: string | null;
}

export interface AuthResponse {
  user: AuthUser;
  expiresAt?: string;
}

export interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  loginWithGoogle: (idToken: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}
