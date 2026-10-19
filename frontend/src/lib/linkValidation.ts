import { z } from "zod";

export const linkSchema = z.object({
  urlOriginal: z
    .string()
    .trim()
    .min(1, {
      message: "O pergaminho principal não pode estar vazio!",
    })
    .url({
      message: "Feitiço falhou! Insere um URL válido (ex: https://google.com)",
    })
    .refine(
      (value) => {
        try {
          const parsed = new URL(value);
          return parsed.protocol === "http:" || parsed.protocol === "https:";
        } catch {
          return false;
        }
      },
      {
        message: "O URL precisa começar com http:// ou https://.",
      },
    ),

  urlPersonalizada: z
    .string()
    .trim()
    .min(3, {
      message: "O link personalizado precisa de pelo menos 3 caracteres.",
    })
    .max(32, {
      message: "O link personalizado é demasiado longo! (Máx. 32 caracteres)",
    })
    .regex(/^[a-zA-Z0-9_-]+$/, {
      message:
        "O link personalizado só pode conter letras, números, hífens e underscores.",
    })
    .optional(),
});
