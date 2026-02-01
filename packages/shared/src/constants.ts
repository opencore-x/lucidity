export const TASK_STATUS_VALUES = ['pending', 'in_progress', 'completed'] as const;

export const TASK_STATUS = {
    PENDING: 'pending',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed'
} as const;

export const PRIORITY_MIN = 1;
export const PRIORITY_MAX = 1000;

export const RECURRING_FREQUENCY_VALUES = ['daily', 'weekly', 'monthly', 'yearly'] as const;

