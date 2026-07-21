import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { importPKCS8, SignJWT } from "https://esm.sh/jose@5.9.6";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
}

let cachedAccessToken: string | null = null;
let tokenExpiresAt = 0;

async function getFirebaseAccessToken(sa: ServiceAccount): Promise<string> {
  if (cachedAccessToken && Date.now() < tokenExpiresAt) return cachedAccessToken;

  const now = Math.floor(Date.now() / 1000);
  const scopes = "https://www.googleapis.com/auth/firebase.messaging";

  const privateKey = await importPKCS8(sa.private_key, "RS256");
  const jwt = await new SignJWT({ scope: scopes })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(sa.client_email)
    .setSubject(sa.client_email)
    .setAudience("https://oauth2.googleapis.com/token")
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(privateKey);

  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Firebase token exchange failed: ${resp.status} ${text}`);
  }

  const data = await resp.json();
  cachedAccessToken = data.access_token;
  tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;
  return cachedAccessToken!;
}

function sanitizeData(data: unknown): Record<string, string> {
  if (!data || typeof data !== "object" || Array.isArray(data)) return {};
  return Object.fromEntries(
    Object.entries(data as Record<string, unknown>).map(([k, v]) => [k, String(v)]),
  );
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const saJson = Deno.env.get("FIREBASE_SERVICE_ACCOUNT_JSON");
    const projectId = Deno.env.get("FIREBASE_PROJECT_ID");
    if (!saJson || !projectId) {
      return new Response(JSON.stringify({ error: "Firebase not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sa: ServiceAccount = JSON.parse(saJson);
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { installationId, token, title, body: msgBody, data } = body;

    let targetToken = typeof token === "string" ? token : "";

    if (!targetToken && typeof installationId === "string") {
      const { data: row } = await supabaseAdmin
        .from("push_installations")
        .select("token")
        .eq("installation_id", installationId)
        .maybeSingle();
      targetToken = row?.token ?? "";
    }

    if (!targetToken) {
      return new Response(JSON.stringify({ error: "token or installationId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accessToken = await getFirebaseAccessToken(sa);

    const message = {
      token: targetToken,
      notification: {
        title: typeof title === "string" && title ? title : "Ritual test push",
        body: typeof msgBody === "string" && msgBody ? msgBody : "Push delivery is configured.",
      },
      data: {
        screen: "Dashboard",
        ...sanitizeData(data),
      },
      android: {
        priority: "high",
        notification: {
          channelId: "ritual-reminders",
          icon: "ic_push_notification",
          color: "#E67E22",
        },
      },
    };

    const fcmResp = await fetch(
      `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message }),
      },
    );

    const fcmData = await fcmResp.json();
    if (!fcmResp.ok) {
      return new Response(JSON.stringify({ error: fcmData }), {
        status: fcmResp.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, messageId: fcmData.name }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[send-test-push]", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
