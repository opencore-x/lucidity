import { z } from 'zod';
import { SENDER_KINDS, HARNESS_REQUEST_KINDS } from '../constants.js';

/**
 * The Lucid harness wire contract (M6). One shape that every transport speaks:
 * phone → hosted room → local daemon (free) or hosted executor (Pro). The room
 * is transport-only; it never inspects payloads. Both the buffered
 * (request/response) and streaming (SSE) forms are defined here so the same
 * envelope works regardless of how a reply is delivered.
 */

// ---- Requests (phone → room → engine) -------------------------------------

// Fields shared by every request, whatever the kind. `id` correlates the reply
// (or stream) back to the caller so one socket can multiplex concurrent turns;
// `stream` opts into SSE token streaming instead of a single buffered reply.
const HarnessRequestBase = z.object({
  id: z.uuidv7(),
  senderKind: z.enum(SENDER_KINDS).default('human'),
  stream: z.boolean().optional(),
});

// One-shot question to Lucid ("Ask Lucid"). The only kind that carries free text.
export const AskRequestSchema = HarnessRequestBase.extend({
  kind: z.literal('ask'),
  prompt: z.string().min(1).max(8000),
});

// Today's briefing. The engine derives the content from the user's tasks, so no
// input beyond the envelope is needed.
export const BriefingRequestSchema = HarnessRequestBase.extend({
  kind: z.literal('briefing'),
});

// Read Lucid's agent journal (past runs it logged). Cursor-paginated newest
// first; `before` is an ISO timestamp echoed from a prior page's `nextBefore`.
export const JournalRequestSchema = HarnessRequestBase.extend({
  kind: z.literal('journal'),
  limit: z.number().int().positive().max(100).optional(),
  before: z.string().optional(),
});

export const HarnessRequestSchema = z.discriminatedUnion('kind', [
  AskRequestSchema,
  BriefingRequestSchema,
  JournalRequestSchema,
]);

// ---- Journal entries -------------------------------------------------------

// One past run in Lucid's journal — a briefing, weekly review, or ask. Sourced
// from the daemon's run log; `kind` is free-form so new job types need no schema
// change.
export const JournalEntrySchema = z.object({
  id: z.string(),
  kind: z.string(),
  title: z.string(),
  body: z.string(),
  createdAt: z.string(),
  costUsd: z.number().optional(),
});

// ---- Responses (buffered, non-streaming) ----------------------------------

const HarnessResponseBase = z.object({
  requestId: z.uuidv7(),
});

export const AskResponseSchema = HarnessResponseBase.extend({
  kind: z.literal('ask'),
  text: z.string(),
  sessionId: z.string().optional(),
  costUsd: z.number().optional(),
});

export const BriefingResponseSchema = HarnessResponseBase.extend({
  kind: z.literal('briefing'),
  text: z.string(),
  costUsd: z.number().optional(),
});

export const JournalResponseSchema = HarnessResponseBase.extend({
  kind: z.literal('journal'),
  entries: z.array(JournalEntrySchema),
  nextBefore: z.string().optional(),
});

export const HarnessResponseSchema = z.discriminatedUnion('kind', [
  AskResponseSchema,
  BriefingResponseSchema,
  JournalResponseSchema,
]);

// ---- Streaming events (over SSE) ------------------------------------------

// A token/tool/done/error event. `requestId` correlates each event to its
// originating request so a single socket can multiplex concurrent streams. This
// is the wire mirror of the runtime's ExecutorStreamEvent, plus correlation and
// a `tool_call` event for surfacing agentic tool use on the phone.
export const HarnessStreamEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('delta'), requestId: z.uuidv7(), text: z.string() }),
  z.object({
    type: z.literal('tool_call'),
    requestId: z.uuidv7(),
    name: z.string(),
    phase: z.enum(['start', 'end']),
  }),
  z.object({
    type: z.literal('done'),
    requestId: z.uuidv7(),
    text: z.string(),
    sessionId: z.string().optional(),
    costUsd: z.number().optional(),
  }),
  z.object({ type: z.literal('error'), requestId: z.uuidv7(), message: z.string() }),
]);

// ---- Message (forward-compat: chat + M4 agent turns) ----------------------

// A single conversational turn. Carries `senderKind` so an agent reply can later
// be posted into an M4 DM thread next to human messages (same shape, one
// `author_kind`). Interactive chat (#257) builds its request/stream on top of
// this; it is intentionally minimal here.
export const HarnessMessageSchema = z.object({
  id: z.uuidv7(),
  senderKind: z.enum(SENDER_KINDS),
  text: z.string(),
  createdAt: z.string(),
});
