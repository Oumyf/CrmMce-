import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
const REDIRECT_URI = Deno.env.get("GOOGLE_REDIRECT_URI")!;

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  try {
    const supabase = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY
    );

    const url = new URL(req.url);
    const code = url.searchParams.get("code");

    // 🔐 Récupérer le JWT utilisateur
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response("Unauthorized", { status: 401 });
    }

    const jwt = authHeader.replace("Bearer ", "");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(jwt);

    if (userError || !user) {
      return new Response("User not found", { status: 401 });
    }

    // 1️⃣ PAS DE CODE → rediriger vers Google
    if (!code) {
      const googleAuthUrl =
        "https://accounts.google.com/o/oauth2/v2/auth?" +
        new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID,
          redirect_uri: REDIRECT_URI,
          response_type: "code",
          access_type: "offline",
          prompt: "consent",
          scope: "https://www.googleapis.com/auth/calendar",
          state: user.id, // 🔥 On passe l'user ID
        }).toString();

      return Response.redirect(googleAuthUrl);
    }

    // 2️⃣ Google renvoie un code → échange token
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });

    const tokens = await tokenRes.json();

    if (!tokens.refresh_token) {
      return new Response("No refresh token received", { status: 400 });
    }

    // 🔐 Stockage sécurisé
    await supabase
      .from("user_google_tokens")
      .upsert({
        user_id: user.id,
        refresh_token: tokens.refresh_token,
      });

    // ✅ Redirection vers ton site
    return Response.redirect(
      "https://lightblue-octopus-799282.hostingersite.com/dashboard"
    );

  } catch (error) {
    console.error(error);
    return new Response("Internal error", { status: 500 });
  }
});