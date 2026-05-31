import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import type { AgentExecutor, ExecutorRunInput, ExecutorResult, ExecutorStreamEvent } from './types.js';

/**
 * Env vars that, if present, make `claude -p` bill that path instead of the
 * user's subscription. In non-interactive (`-p`) mode the key is *always* used
 * when present, so the daemon must run `claude` with these unset to keep free
 * BYOAI actually free. (See claude-code-headless.md, authentication precedence.)
 */
const SANITIZED_ENV_KEYS = [
  'ANTHROPIC_API_KEY',
  'ANTHROPIC_AUTH_TOKEN',
  'CLAUDE_CODE_USE_BEDROCK',
  'CLAUDE_CODE_USE_VERTEX',
  'CLAUDE_CODE_USE_FOUNDRY',
] as const;

export interface ClaudeCodeExecutorOptions {
  /** CLI binary to invoke. Default: `"claude"` (must be on PATH). */
  command?: string;
  /** Default model alias/id when a run doesn't specify one (e.g. `"sonnet"`). */
  defaultModel?: string;
  /** Default hard timeout in ms. Default: 120_000. */
  defaultTimeoutMs?: number;
  /**
   * Long-lived token from `claude setup-token`, set as `CLAUDE_CODE_OAUTH_TOKEN`
   * so fully headless hosts (no prior `/login`) ride the subscription. Optional
   * when the machine already has interactive login credentials in the keychain.
   */
  oauthToken?: string;
}

/** Shape of `claude --print --output-format json` stdout. */
interface ClaudeJsonResult {
  result?: string;
  session_id?: string;
  total_cost_usd?: number;
  is_error?: boolean;
  subtype?: string;
}

/** One line of `--output-format stream-json` output. */
interface StreamLine {
  type?: string;
  event?: { type?: string; delta?: { text?: string } };
  result?: string;
  session_id?: string;
  total_cost_usd?: number;
  is_error?: boolean;
  subtype?: string;
}

/**
 * Free-tier executor: spawns the official `claude --print` CLI, riding the
 * user's Pro/Max subscription. Never uses `--bare` (incompatible with OAuth/
 * subscription auth).
 *
 * MCP note: the briefing pre-fetches its data and passes no `mcp` wiring, so the
 * run does no tool calls. For agentic runs later, pass `input.mcp` and this
 * executor adds `--mcp-config --strict-mcp-config --allowedTools`.
 */
export class ClaudeCodeExecutor implements AgentExecutor {
  readonly name = 'claude-code';
  private readonly command: string;
  private readonly defaultModel?: string;
  private readonly defaultTimeoutMs: number;
  private readonly oauthToken?: string;

  constructor(opts: ClaudeCodeExecutorOptions = {}) {
    this.command = opts.command ?? 'claude';
    this.defaultModel = opts.defaultModel;
    this.defaultTimeoutMs = opts.defaultTimeoutMs ?? 120_000;
    this.oauthToken = opts.oauthToken;
  }

  run(input: ExecutorRunInput): Promise<ExecutorResult> {
    return new Promise<ExecutorResult>((resolve, reject) => {
      const args = this.buildArgs(input);
      const env = this.buildEnv();
      const timeoutMs = input.timeoutMs ?? this.defaultTimeoutMs;
      const controller = new AbortController();

      let settled = false;
      let timedOut = false;
      const finish = (fn: () => void) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (input.signal) input.signal.removeEventListener('abort', onExternalAbort);
        fn();
      };

      const timer = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, timeoutMs);

      const onExternalAbort = () => controller.abort();
      if (input.signal) {
        if (input.signal.aborted) controller.abort();
        else input.signal.addEventListener('abort', onExternalAbort, { once: true });
      }

      const child = spawn(this.command, args, {
        env,
        stdio: ['ignore', 'pipe', 'pipe'],
        signal: controller.signal,
      });

      let stdout = '';
      let stderr = '';
      child.stdout?.on('data', (chunk: Buffer) => {
        stdout += chunk.toString();
      });
      child.stderr?.on('data', (chunk: Buffer) => {
        stderr += chunk.toString();
      });

      child.on('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'ENOENT') {
          finish(() =>
            reject(
              new Error(
                `Claude Code CLI not found (tried "${this.command}"). Install it and ensure ` +
                  `it is on PATH, or set the executor "command" option. See https://code.claude.com/docs.`,
              ),
            ),
          );
          return;
        }
        if (err.name === 'AbortError') {
          finish(() => reject(this.abortError(timedOut, timeoutMs)));
          return;
        }
        finish(() => reject(err));
      });

      child.on('close', (code) => {
        if (controller.signal.aborted) {
          finish(() => reject(this.abortError(timedOut, timeoutMs)));
          return;
        }
        if (code !== 0) {
          const detail = stderr.trim() || stdout.trim() || `exit code ${code}`;
          finish(() => reject(new Error(`Claude Code exited with code ${code}: ${detail}`)));
          return;
        }
        finish(() => {
          try {
            resolve(this.parse(stdout));
          } catch (err) {
            reject(err as Error);
          }
        });
      });
    });
  }

  async *runStream(input: ExecutorRunInput): AsyncIterable<ExecutorStreamEvent> {
    const args = this.buildStreamArgs(input);
    const env = this.buildEnv();
    const timeoutMs = input.timeoutMs ?? this.defaultTimeoutMs;
    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);
    const onAbort = () => controller.abort();
    if (input.signal) {
      if (input.signal.aborted) controller.abort();
      else input.signal.addEventListener('abort', onAbort, { once: true });
    }

    const child = spawn(this.command, args, { env, stdio: ['ignore', 'pipe', 'pipe'], signal: controller.signal });
    let stderr = '';
    child.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    let spawnError: NodeJS.ErrnoException | null = null;
    child.on('error', (err: NodeJS.ErrnoException) => {
      spawnError = err;
    });

    try {
      if (!child.stdout) throw new Error('Claude Code produced no stdout stream.');
      const rl = createInterface({ input: child.stdout, crlfDelay: Infinity });
      for await (const line of rl) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        let evt: StreamLine;
        try {
          evt = JSON.parse(trimmed) as StreamLine;
        } catch {
          continue;
        }
        if (evt.type === 'stream_event' && evt.event?.type === 'content_block_delta') {
          const text = evt.event.delta?.text;
          if (typeof text === 'string' && text.length > 0) yield { type: 'delta', text };
        } else if (evt.type === 'result') {
          if (evt.is_error) {
            throw new Error(`Claude Code reported an error: ${evt.result ?? evt.subtype ?? 'unknown'}`);
          }
          yield { type: 'done', text: (evt.result ?? '').trim(), sessionId: evt.session_id, costUsd: evt.total_cost_usd };
        }
      }
    } finally {
      clearTimeout(timer);
      if (input.signal) input.signal.removeEventListener('abort', onAbort);
      if (child.exitCode === null && !child.killed) child.kill('SIGTERM');
    }

    if (spawnError) {
      const err: NodeJS.ErrnoException = spawnError;
      throw err.code === 'ENOENT'
        ? new Error(`Claude Code CLI not found (tried "${this.command}"). Install it and ensure it is on PATH.`)
        : err;
    }
    if (controller.signal.aborted) {
      throw new Error(timedOut ? `Claude Code stream timed out after ${timeoutMs}ms.` : 'Claude Code stream was aborted.');
    }
    if (stderr.trim()) {
      // Non-fatal: surface engine warnings for debugging without failing the stream.
    }
  }

  private buildStreamArgs(input: ExecutorRunInput): string[] {
    const args = ['--print', '--output-format', 'stream-json', '--include-partial-messages', '--verbose'];
    if (input.resume) {
      // Resuming a session keeps its system prompt + model; just send the new message.
      args.push('--resume', input.resume);
    } else {
      if (input.sessionId) args.push('--session-id', input.sessionId);
      if (input.systemPrompt) args.push('--append-system-prompt', input.systemPrompt);
      const model = input.model ?? this.defaultModel;
      if (model) args.push('--model', model);
    }
    args.push(input.userPrompt);
    return args;
  }

  private buildArgs(input: ExecutorRunInput): string[] {
    const args = ['--print', '--output-format', 'json'];
    if (input.systemPrompt) args.push('--append-system-prompt', input.systemPrompt);
    const model = input.model ?? this.defaultModel;
    if (model) args.push('--model', model);
    if (input.mcp) {
      args.push('--mcp-config', input.mcp.configPath, '--strict-mcp-config');
      if (input.mcp.allowedTools?.length) {
        args.push('--allowedTools', input.mcp.allowedTools.join(','));
      }
    }
    // Prompt as the trailing positional arg. Fine for controlled prompts;
    // switch to stdin for arbitrary/large input in later chunks.
    args.push(input.userPrompt);
    return args;
  }

  private buildEnv(): NodeJS.ProcessEnv {
    const env: NodeJS.ProcessEnv = { ...process.env };
    for (const key of SANITIZED_ENV_KEYS) delete env[key];
    if (this.oauthToken) env['CLAUDE_CODE_OAUTH_TOKEN'] = this.oauthToken;
    return env;
  }

  private parse(stdout: string): ExecutorResult {
    const trimmed = stdout.trim();
    let json: ClaudeJsonResult | undefined;
    try {
      json = JSON.parse(trimmed) as ClaudeJsonResult;
    } catch {
      // Not JSON — fall through to raw text.
    }
    if (json && typeof json === 'object') {
      if (json.is_error) {
        throw new Error(`Claude Code reported an error: ${json.result ?? json.subtype ?? 'unknown'}`);
      }
      return {
        text: (json.result ?? '').trim(),
        sessionId: json.session_id,
        costUsd: json.total_cost_usd,
      };
    }
    return { text: trimmed };
  }

  private abortError(timedOut: boolean, timeoutMs: number): Error {
    return timedOut
      ? new Error(`Claude Code run timed out after ${timeoutMs}ms.`)
      : new Error('Claude Code run was aborted.');
  }
}
