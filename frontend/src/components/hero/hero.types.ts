import type { Dispatch, FormEventHandler, SetStateAction } from "react";

export interface HeroProps {
  isDarkMode: boolean;
  mensagemMascote: string | null;
  falarComMascote: () => void;

  linkInput: string;
  setLinkInput: Dispatch<SetStateAction<string>>;

  vanityUrl: string;
  setVanityUrl: Dispatch<SetStateAction<string>>;

  handleEncurtar: FormEventHandler<HTMLFormElement>;
  isLoading: boolean;

  linkGerado: string | null;
  copiarLink: () => void;
  copiado: boolean;
  erroValidacao: string | null;

  isPersonalizado: boolean;
  setIsPersonalizado: Dispatch<SetStateAction<boolean>>;

  isUnica: boolean;
  setIsUnica: Dispatch<SetStateAction<boolean>>;

  isSenha: boolean;
  setIsSenha: Dispatch<SetStateAction<boolean>>;

  senhaInput: string;
  setSenhaInput: Dispatch<SetStateAction<string>>;
}

export interface HeroThemeProps {
  isDarkMode: boolean;
}
