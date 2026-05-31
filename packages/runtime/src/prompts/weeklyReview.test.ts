import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildWeeklyReviewPrompt, type WeeklyReviewStats } from './weeklyReview.js';
import type { Task, User } from '@lucidity/shared';

const NOW = new Date('2026-06-01T09:00:00');
const USER: Pick<User, 'name' | 'email'> = { name: 'Ada', email: 'ada@example.com' };
const STATS: WeeklyReviewStats = {
  total: 12, pending: 7, inProgress: 2, completed: 3, blocked: 0, deferred: 0, overdue: 4,
};

function makeTask(overrides: Partial<Task>): Task {
  return {
    id: 'id', userId: 'u', projectId: null, milestoneId: null, parentTaskId: null,
    title: 'Untitled', description: null, status: 'pending', priority: 500, position: null,
    taskNumber: null, completedAt: null, dueDate: null, reminderAt: null, recurringFrequency: null,
    reviewedAt: null, activeTimerStartedAt: null, totalElapsedSeconds: 0, createdAt: NOW, updatedAt: NOW,
    ...overrides,
  } as Task;
}

test('weekly review includes the stats line and this-week tasks', () => {
  const tasks = [makeTask({ title: 'Ship release', dueDate: new Date('2026-06-03T12:00:00') })];
  const { systemPrompt, userPrompt } = buildWeeklyReviewPrompt({ user: USER, tasks, stats: STATS, persona: 'PERSONA', now: NOW });

  assert.ok(systemPrompt.startsWith('PERSONA\n---'));
  assert.ok(systemPrompt.includes('weekly review for Ada'));
  assert.ok(userPrompt.startsWith('Weekly review for Ada.'));
  assert.ok(userPrompt.includes('Open tasks: 12 · overdue: 4 · in progress: 2 · completed: 3.'));
  assert.ok(userPrompt.includes('1 task due this week:'));
  assert.ok(userPrompt.includes('- Ship release — due Wed, Jun 3'));
  assert.ok(!userPrompt.includes('undefined'));
});

test('handles an empty week', () => {
  const { userPrompt } = buildWeeklyReviewPrompt({ user: USER, tasks: [], stats: STATS, persona: 'P', now: NOW });
  assert.ok(userPrompt.includes('Nothing is due in the week ahead.'));
});

test('weaves in the memory seam', () => {
  const { userPrompt } = buildWeeklyReviewPrompt({
    user: USER, tasks: [], stats: STATS, persona: 'P', now: NOW, memory: '- Prefers deep work',
  });
  assert.ok(userPrompt.includes('What you remember about them:\n- Prefers deep work'));
});
