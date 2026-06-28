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

