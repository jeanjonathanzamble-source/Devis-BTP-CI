import { drizzle } from "drizzle-orm/netlify-db";
import * as schema from "./schema";

// Connexion gérée automatiquement par Netlify Database (aucune URL à configurer).
export const db = drizzle({ schema });
