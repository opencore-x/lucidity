export const TASK_STATUS_VALUES = ['pending', 'in_progress', 'completed', 'blocked', 'deferred'] as const;

export const TASK_STATUS = {
    PENDING: 'pending',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    BLOCKED: 'blocked',
    DEFERRED: 'deferred',
} as const;

export const PRIORITY_MIN = 1;
export const PRIORITY_MAX = 1000;

export const RECURRING_FREQUENCY_VALUES = ['daily', 'weekly', 'monthly', 'yearly'] as const;

export const COMMENT_SOURCE_VALUES = ['user', 'claude'] as const;
export const AI_REVIEW_DEPTH_VALUES = ['deep', 'light', 'none'] as const;

export const TIME_SESSION_DEVICE_VALUES = ['mobile', 'watch', 'web'] as const;

export const PROJECT_VISIBILITY_VALUES = ['private', 'shared', 'public'] as const;
export const MEMBER_ACCESS_VALUES = ['view', 'edit'] as const;

// The current user's effective access to a project, resolved server-side and
// returned with each project so clients can gate edit affordances. 'owner' and
// 'edit' may mutate; 'view' is read-only.
export const PROJECT_ACCESS_VALUES = ['owner', 'edit', 'view'] as const;

// Who authored a turn. A shared primitive: the Lucid harness (M6) sets it on
// requests/messages, and M4 DM threads reuse it so an agent reply can later post
// into a human conversation under one `author_kind`. 'human' for now; real
// 'agent' turns ship with interactive chat.
export const SENDER_KINDS = ['human', 'agent'] as const;

// The read capabilities Lucid exposes over the harness, satisfied identically by
// both transports — the local daemon gateway (free) and the hosted Pro server.
export const HARNESS_REQUEST_KINDS = ['ask', 'briefing', 'journal'] as const;

