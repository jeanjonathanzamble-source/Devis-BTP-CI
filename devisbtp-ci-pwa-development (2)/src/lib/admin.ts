import { NextRequest } from "next/server";

function requireEnv(name: string, fallback: string) {
  const value = process.env[name]?.trim();
  if (value) return value;
  if (process.env.NODE_ENV === "production") {
    throw new Error(`Missing required environment variable: ${name}. Configure it before launching the site.`);
  }
  return fallback;
}

export const ADMIN_PIN = requireEnv("ADMIN_PIN", "CHANGE_ME_ADMIN_PIN");
export const FOUNDER_CODE = requireEnv("FOUNDER_CODE", "CHANGE_ME_FOUNDER_CODE");
export const ADMIN_WHATSAPP = requireEnv("ADMIN_WHATSAPP", "225000000000");

export type NiveauAdmin = "admin" | "fondateur";

/** Valide une clé d'administration (PIN ou code fondateur) et renvoie le niveau associé. */
export function niveauAcces(cle: string | null | undefined): NiveauAdmin | null {
  const valeur = String(cle || "").trim();
  if (!valeur) return null;
  if (valeur === ADMIN_PIN) return "admin";
  if (valeur.toUpperCase() === FOUNDER_CODE.toUpperCase()) return "fondateur";
  return null;
}

export function isAdmin(req: NextRequest) {
  return niveauAcces(req.headers.get("x-admin-key") || req.headers.get("x-admin-pin")) !== null;
}

export function illimiteActif(ent: { plan: string; illimiteExpireAt?: Date | string | null }) {
  if (ent.plan !== "illimite") return false;
  if (!ent.illimiteExpireAt) return true; // accès permanent (fondateur)
  return new Date(ent.illimiteExpireAt).getTime() > Date.now();
}
