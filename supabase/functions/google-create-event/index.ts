import { createClient } from "@supabase/supabase-js";
import { serve } from "std/http/server.ts";

serve(async (req: Request) => {
  try {
    const { event } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response("Non autorisé", { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);

    if (!user) {
      return new Response("Utilisateur non trouvé", { status: 401 });
    }

    const { data: google } = await supabase
      .from("user_google_tokens")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (!google) {
      return new Response("Google non connecté", { status: 400 });
    }

    let accessToken = google.access_token;

    // 🔁 REFRESH SI EXPIRÉ
    const isExpired =
      new Date(google.expires_at).getTime() < Date.now();

    if (isExpired) {
      const refreshResponse = await fetch(
        "https://oauth2.googleapis.com/token",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            client_id: Deno.env.get("GOOGLE_CLIENT_ID")!,
            client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET")!,
            refresh_token: google.refresh_token,
            grant_type: "refresh_token",
          }),
        }
      );

      const refreshed = await refreshResponse.json();

      if (!refreshResponse.ok) {
        return new Response("Refresh token invalide", { status: 400 });
      }

      accessToken = refreshed.access_token;

      // 🔄 Mise à jour DB
      await supabase
        .from("user_google_tokens")
        .update({
          access_token: refreshed.access_token,
          expires_at: new Date(Date.now() + refreshed.expires_in * 1000),
        })
        .eq("user_id", user.id);
    }

    // 📅 Création événement Google
    const googleResponse = await fetch(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          summary: event.title,
          description: event.description,
          start: {
            dateTime: event.start_date,
            timeZone: "Africa/Dakar",
          },
          end: {
            dateTime: event.start_date,
            timeZone: "Africa/Dakar",
          },
        }),
      }
    );

    if (!googleResponse.ok) {
      const errText = await googleResponse.text();
      return new Response(errText, { status: 400 });
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { "Content-Type": "application/json" } }
    );

  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Erreur serveur";

    return new Response(message, { status: 500 });
  }
});