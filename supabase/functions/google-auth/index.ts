import { serve } from "std/http/server.ts";
import { createClient } from "@supabase/supabase-js";

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
const REDIRECT_URI = Deno.env.get("GOOGLE_REDIRECT_URI")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// ✅ Headers CORS — autorise ton frontend local ET en production
const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // ou "http://192.168.1.68:8080" pour être strict
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

serve(async (req: Request) => {
  // ✅ Preflight OPTIONS — obligatoire pour CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    // ── CALLBACK Google ──
    if (code && state) {
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
        return new Response("No refresh token received", {
          status: 400,
          headers: corsHeaders,
        });
      }

      await supabase.from("user_google_tokens").upsert({
        user_id: state,
        refresh_token: tokens.refresh_token,
      });

      return Response.redirect(
        "https://lightblue-octopus-799282.hostingersite.com/dashboard"
      );
    }

    // ── INITIATION OAuth ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    }

    const jwt = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(jwt);

    if (userError || !user) {
      return new Response("User not found", { status: 401, headers: corsHeaders });
    }

    const googleAuthUrl =
      "https://accounts.google.com/o/oauth2/v2/auth?" +
      new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        redirect_uri: REDIRECT_URI,
        response_type: "code",
        access_type: "offline",
        prompt: "consent",
        scope: "https://www.googleapis.com/auth/calendar",
        state: user.id,
      }).toString();

    return new Response(
      JSON.stringify({ url: googleAuthUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error(error);
    return new Response("Internal error", { status: 500, headers: corsHeaders });
  }
});