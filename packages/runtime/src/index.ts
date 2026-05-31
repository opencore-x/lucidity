// Prompt assembly (Lucid's "brain" — pure, stateless)
export { buildBriefingPrompt } from './prompts/briefing.js';
export type { BuildBriefingPromptInput, BriefingPrompt } from './prompts/briefing.js';

// Persona
export { loadDefaultPersona } from './persona/index.js';

// Executor seam
export type { AgentExecutor, ExecutorRunInput, ExecutorResult } from './executor/types.js';
export { ClaudeCodeExecutor } from './executor/claudeCode.js';
export type { ClaudeCodeExecutorOptions } from './executor/claudeCode.js';

// API client
export { createApiClient } from './client.js';
export type { ApiClient, ApiClientConfig } from './client.js';
