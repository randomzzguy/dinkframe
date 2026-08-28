import { z } from "zod";

const optionalWhatsapp = z
  .string()
  .trim()
  .max(30, "Keep the WhatsApp number under 30 characters.")
  .refine(
    (value) => !value || value.length >= 8,
    "Enter at least 8 characters or leave WhatsApp blank.",
  )
  .transform((value) => value || undefined);

const optionalInstagramHandle = z
  .string()
  .trim()
  .max(80, "Keep the Instagram handle under 80 characters.")
  .transform((value) => value.replace(/^@+/, "") || undefined);

export const profileDetailsSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Enter your full name.")
    .max(120, "Keep your full name under 120 characters."),
  whatsapp: optionalWhatsapp,
  instagramHandle: optionalInstagramHandle,
});

export type ProfileDetailsInput = z.infer<typeof profileDetailsSchema>;
