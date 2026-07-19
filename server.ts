import dotenv from 'dotenv';
import express from 'express';
import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.server' });
dotenv.config();

type PushPlatform = 'android' | 'ios' | 'web' | 'unknown';

interface PushInstallation {
  installationId: string;
  token: string;
  platform: PushPlatform;
  updatedAt: string;
}

const app = express();
const port = Number(process.env.PORT || 8787);
let supabaseAdmin: SupabaseClient | null = null;

app.use(express.json({ limit: '128kb' }));
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
});

function isPushPlatform(value: unknown): value is PushPlatform {
  return value === 'android' || value === 'ios' || value === 'web' || value === 'unknown';
}

function sanitizeData(data: unknown): Record<string, string> {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return {};
  return Object.fromEntries(
    Object.entries(data as Record<string, unknown>).map(([key, value]) => [key, String(value)]),
  );
}

function initializeFirebaseAdmin(): void {
  if (getApps().length > 0) return;

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (serviceAccountJson) {
    initializeApp({
      credential: cert(JSON.parse(serviceAccountJson)),
      projectId: process.env.FIREBASE_PROJECT_ID,
    });
    return;
  }

  initializeApp({
    credential: applicationDefault(),
    projectId: process.env.FIREBASE_PROJECT_ID,
  });
}

function getSupabaseAdmin(): SupabaseClient {
  if (supabaseAdmin) return supabaseAdmin;

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured on the backend');
  }

  supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return supabaseAdmin;
}

async function getAuthenticatedUserId(req: express.Request): Promise<string | null> {
  const header = req.headers.authorization || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;

  const { data, error } = await getSupabaseAdmin().auth.getUser(match[1]);
  if (error || !data.user) return null;
  return data.user.id;
}

async function findPushInstallation(installationId: string): Promise<PushInstallation | null> {
  const { data, error } = await getSupabaseAdmin()
    .from('push_installations')
    .select('installation_id, token, platform, updated_at')
    .eq('installation_id', installationId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    installationId: data.installation_id,
    token: data.token,
    platform: data.platform,
    updatedAt: data.updated_at,
  };
}

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/api/notifications/push-token', async (req, res, next) => {
  try {
    const { installationId, token, platform } = req.body ?? {};
    const userId = await getAuthenticatedUserId(req);

    if (typeof installationId !== 'string' || installationId.length < 8) {
      res.status(400).json({ error: 'installationId is required' });
      return;
    }
    if (typeof token !== 'string' || token.length < 16) {
      res.status(400).json({ error: 'token is required' });
      return;
    }
    if (!isPushPlatform(platform)) {
      res.status(400).json({ error: 'platform must be android, ios, web, or unknown' });
      return;
    }
    if (!userId) {
      res.status(401).json({ error: 'Supabase user session is required' });
      return;
    }

    const { error } = await getSupabaseAdmin()
      .from('push_installations')
      .upsert({
        installation_id: installationId,
        user_id: userId,
        token,
        platform,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'installation_id' });

    if (error) throw error;
    res.json({ ok: true, installationId, platform });
  } catch (error) {
    next(error);
  }
});

app.delete('/api/notifications/push-token/:installationId', async (req, res, next) => {
  try {
    const userId = await getAuthenticatedUserId(req);
    if (!userId) {
      res.status(401).json({ error: 'Supabase user session is required' });
      return;
    }

    const { error } = await getSupabaseAdmin()
      .from('push_installations')
      .delete()
      .eq('installation_id', req.params.installationId)
      .eq('user_id', userId);

    if (error) throw error;
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.post('/api/notifications/test-push', async (req, res, next) => {
  try {
    if (process.env.NODE_ENV === 'production' && process.env.ENABLE_TEST_PUSH !== 'true') {
      res.status(404).json({ error: 'Not found' });
      return;
    }

    const { installationId, token, title, body, data } = req.body ?? {};
    let targetToken = typeof token === 'string' ? token : '';

    if (!targetToken && typeof installationId === 'string') {
      targetToken = (await findPushInstallation(installationId))?.token ?? '';
    }

    if (!targetToken) {
      res.status(400).json({ error: 'token or installationId is required' });
      return;
    }

    initializeFirebaseAdmin();
    const messageId = await getMessaging().send({
      token: targetToken,
      notification: {
        title: typeof title === 'string' && title ? title : 'Ritual test push',
        body: typeof body === 'string' && body ? body : 'Push delivery is configured.',
      },
      data: {
        screen: 'Dashboard',
        ...sanitizeData(data),
      },
      android: {
        priority: 'high',
        notification: {
          channelId: 'ritual-reminders',
          icon: 'ic_push_notification',
          color: '#E67E22',
        },
      },
    });

    res.json({ ok: true, messageId });
  } catch (error) {
    next(error);
  }
});

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[server] Request failed:', error);
  res.status(500).json({
    error: error instanceof Error ? error.message : 'Internal server error',
  });
});

export { app };
export default app;

if (process.env.VERCEL !== '1') {
  app.listen(port, () => {
    console.log(`[server] Ritual API listening on http://localhost:${port}`);
  });
}
