import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import {
  buildChatSystemPrompt,
  createApiClient,
  type AgentExecutor,
  type ExecutorRunInput,
} from '@lucidity/runtime';
import type { Task, User } from '@lucidity/shared';
import type { DaemonConfig } from '../config.js';
import { LaneQueue } from '../queue.js';
import { createVault } from '../vault.js';

export interface ChatServerDeps {
  config: DaemonConfig;
  executor: AgentExecutor;
  token: string;
  /** Shared lane queue (so chat turns serialize against briefings too). */
  queue?: LaneQueue;
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => {
      data += c;
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

/**
 * The "lite local gateway": a loopback HTTP server hosting interactive Lucid.
 * `POST /chat` { message, sessionId? } streams the reply as SSE. Turn 1 (no
 * sessionId) loads persona + memory + a task snapshot into the chat system
 * prompt and assigns a session id; later turns resume it (claude keeps the
 * context + system prompt). Bearer-token auth; bind to 127.0.0.1 only.
 */
export function createChatServer(deps: ChatServerDeps): Server {
  const { config, executor, token } = deps;
  const queue = deps.queue ?? new LaneQueue();
  const vault = createVault(config.vaultPath);

  return createServer((req, res) => {
    void handle(req, res).catch(() => {
      if (!res.headersSent) res.writeHead(500);
      res.end();
    });
  });

  async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    if (req.method === 'GET' && req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
      return;
    }
    if (req.method !== 'POST' || req.url !== '/chat') {
      res.writeHead(404);
      res.end('not found');
      return;
    }
    if (req.headers['authorization'] !== `Bearer ${token}`) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'unauthorized' }));
      return;
    }

    let parsed: { message?: string; sessionId?: string };
    try {
      parsed = JSON.parse(await readBody(req));
    } catch {
      res.writeHead(400);
      res.end('invalid json');
      return;
    }
    const message = (parsed.message ?? '').trim();
    if (!message) {
      res.writeHead(400);
      res.end('empty message');
      return;
    }
    if (!executor.runStream) {
      res.writeHead(501);
      res.end('streaming not supported');
      return;
    }

    const resume = parsed.sessionId;
    const sessionId = resume ?? randomUUID();

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    const send = (obj: unknown) => res.write(`data: ${JSON.stringify(obj)}\n\n`);
    send({ type: 'session', sessionId });

    const ac = new AbortController();
    req.on('close', () => ac.abort());

    await queue.run(sessionId, async () => {
      try {
        const input = await buildChatInput();
        for await (const ev of executor.runStream!({ ...input, signal: ac.signal })) {
          if (ev.type === 'delta') send({ type: 'delta', text: ev.text });
          else send({ type: 'done', sessionId: ev.sessionId ?? sessionId, costUsd: ev.costUsd });
        }
      } catch (err) {
        send({ type: 'error', message: err instanceof Error ? err.message : String(err) });
      } finally {
        res.end();
      }
    });

    async function buildChatInput(): Promise<ExecutorRunInput> {
      if (resume) return { userPrompt: message, resume, model: config.model };
      const persona = vault.readPersona();
      const facts = vault.readMemoryFacts();
      const memory = facts.length ? facts.map((f) => `- ${f}`).join('\n') : undefined;
      let name = '';
      let context: string | undefined;
      try {
        const api = createApiClient({ apiUrl: config.apiUrl, apiKey: config.apiKey });
        const [tasks, user] = await Promise.all([
          api.request<Task[]>('/api/tasks/today').catch(() => [] as Task[]),
          api.request<User>('/api/users/me'),
        ]);
        name = user.name ?? '';
        if (tasks.length) context = `Today/overdue tasks: ${tasks.map((t) => t.title).filter(Boolean).join('; ')}`;
      } catch {
        // Offline / API down → chat still works, just without live task context.
      }
      const systemPrompt = buildChatSystemPrompt({ user: { name }, memory, persona, context });
      return { userPrompt: message, systemPrompt, sessionId, model: config.model };
    }
  }
}
