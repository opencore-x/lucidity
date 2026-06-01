export interface ExecutorRunInput {
  /** The main prompt (passed to `claude -p "<userPrompt>"`). */
  userPrompt: string;
  /** System prompt appended to the engine's default (`--append-system-prompt`). */
  systemPrompt?: string;
  /** Model alias or full id (`--model`). Falls back to the executor default. */
  model?: string;
  /** Hard timeout in ms; the run is aborted/killed if exceeded. */
  timeoutMs?: number;
  /**
   * Optional MCP tool wiring for *agentic* runs (later chunks). When set, the
   * executor passes `--mcp-config` + `--strict-mcp-config` and auto-approves the
   * listed tools. Chunk 0's briefing pre-fetches its data and leaves this unset,
   * so the run makes no tool calls (no permission prompts, frugal, deterministic).
   */
  mcp?: {
    /** Path to a hermetic MCP config JSON (see the daemon's generator, later). */
    configPath: string;
    /** Tool patterns to auto-approve, e.g. `["mcp__lucidity__*"]`. */
    allowedTools?: string[];
  };
  /** Cooperative cancellation (e.g. daemon shutdown). */
  signal?: AbortSignal;
  /** Assign a specific session id (interactive chat, turn 1). */
  sessionId?: string;
  /** Resume an existing chat session by id (subsequent turns); systemPrompt/model are already bound. */
  resume?: string;
}

/** Streaming event from {@link AgentExecutor.runStream}. */
export type ExecutorStreamEvent =
  | { type: 'delta'; text: string }
  | { type: 'done'; text: string; sessionId?: string; costUsd?: number };

export interface ExecutorResult {
  /** The model's text response. */
  text: string;
  /** Engine session id, when reported (e.g. Claude Code json output). */
  sessionId?: string;
  /** Run cost in USD, when reported. */
  costUsd?: number;
}

/**
 * The one seam between Lucid's brain (prompt assembly) and the underlying model
 * engine. Free tier = {@link import('./claudeCode.js').ClaudeCodeExecutor}
 * (`claude --print` on the user's subscription). Later: an Anthropic-SDK executor
 * (Pro) and a Codex executor (platform-risk hedge) — same prompts, different engine.
 */
export interface AgentExecutor {
  /** Stable id for logs, e.g. `"claude-code"`. */
  readonly name: string;
  run(input: ExecutorRunInput): Promise<ExecutorResult>;
  /** Optional token-streaming variant for interactive chat. */
  runStream?(input: ExecutorRunInput): AsyncIterable<ExecutorStreamEvent>;
}
