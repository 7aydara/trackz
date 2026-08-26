import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Toutes les routes sauf les assets statiques, les images et les
     * fichiers de la PWA. Le manifeste et le service worker doivent
     * rester accessibles sans session : sinon le navigateur recoit une
     * redirection vers /login au lieu du fichier, et l'installation
     * comme les notifications push echouent silencieusement.
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw\\.js|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|webmanifest)$).*)",
  ],
};
