import 'dotenv/config';
import express from 'express';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

type PushPlatform = 'android' | 'ios' | 'web' | 'unknown';

interface PushInstallation {
  installationId: string;
  token: string;
  platform: PushPlatform;
  updatedAt: string;
}

const app = express();
const port = Number(process.env.PORT || 8787);
const dataDir = path.resolve(process.cwd(), '.data');
const installationsPath = path.join(dataDir, 'push-installations.json');

app.use(express.json({ limit: '128kb' }));
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
});

async function readInstallations(): Promise<PushInstallation[]> {
  try {
    const content = await fs.readFile(installationsPath, 'utf8');
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error: any) {
    if (error?.code === 'ENOENT') return [];
    throw error;
  }
}

async function writeInstallations(installations: PushInstallation[]): Promise<void> {
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(installationsPath, JSON.stringify(installations, null, 2), 'utf8');
}

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

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/api/notifications/push-token', async (req, res, next) => {
  try {
    const { installationId, token, platform } = req.body ?? {};

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

    const installations = await readInstallations();
    const nextInstallation: PushInstallation = {
      installationId,
      token,
      platform,
      updatedAt: new Date().toISOString(),
    };
    const nextInstallations = [
      nextInstallation,
      ...installations.filter((item) => item.installationId !== installationId),
    ];

    await writeInstallations(nextInstallations);
    res.json({ ok: true, installationId, platform });
  } catch (error) {
    next(error);
  }
});

app.delete('/api/notifications/push-token/:installationId', async (req, res, next) => {
  try {
    const installations = await readInstallations();
    const nextInstallations = installations.filter((item) => item.installationId !== req.params.installationId);
    await writeInstallations(nextInstallations);
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
      const installations = await readInstallations();
      targetToken = installations.find((item) => item.installationId === installationId)?.token ?? '';
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

app.listen(port, () => {
  console.log(`[server] Ritual API listening on http://localhost:${port}`);
});
