// Prompt assembly (Lucid's "brain" — pure, stateless)
export { buildBriefingPrompt } from './prompts/briefing.js';
export type { BuildBriefingPromptInput, BriefingPrompt } from './prompts/briefing.js';
export { buildMemoryReflectionPrompt } from './prompts/reflection.js';
export type { BuildMemoryReflectionPromptInput, ReflectionPrompt } from './prompts/reflection.js';
export { buildChatSystemPrompt } from './prompts/chat.js';
export type { BuildChatSystemPromptInput } from './prompts/chat.js';
export { buildWeeklyReviewPrompt } from './prompts/weeklyReview.js';
export type {
  BuildWeeklyReviewPromptInput,
  WeeklyReviewPrompt,
  WeeklyReviewStats,
} from './prompts/weeklyReview.js';

// Memory (durable facts) — pure helpers
export { parseFacts, mergeFacts, renderMemoryFile } from './memory/merge.js';

// Persona
export { loadDefaultPersona } from './persona/index.js';

// Executor seam
export type { AgentExecutor, ExecutorRunInput, ExecutorResult, ExecutorStreamEvent } from './executor/types.js';
export { ClaudeCodeExecutor } from './executor/claudeCode.js';
export type { ClaudeCodeExecutorOptions } from './executor/claudeCode.js';

// Harness seam — the one callable surface both transports invoke (ask/briefing/journal)
export { createLucidHarness } from './harness/index.js';
export type {
  LucidHarnessDeps,
  LucidHarness,
  AskInput,
  BriefingInput,
  HarnessReply,
  JournalQuery,
  JournalResult,
  JournalSource,
} from './harness/index.js';

// API client
export { createApiClient } from './client.js';
export type { ApiClient, ApiClientConfig } from './client.js';
