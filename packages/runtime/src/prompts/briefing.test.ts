import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildBriefingPrompt } from './briefing.js';
import type { Task, User } from '@lucidity/shared';

// Run via the package `test` script with TZ=UTC so Date getters are deterministic.
const NOW = new Date('2026-05-31T08:30:00'); // morning, "Sun, May 31" in UTC
const PERSONA = 'TEST PERSONA';
const USER: Pick<User, 'name' | 'email'> = { name: 'Ada', email: 'ada@example.com' };

function makeTask(overrides: Partial<Task>): Task {
  return {
    id: 'id',
    userId: 'user',
    projectId: null,
    milestoneId: null,
    parentTaskId: null,
    title: 'Untitled',
    description: null,
    status: 'pending',
    priority: 500,
    position: null,
    taskNumber: null,
    completedAt: null,
    dueDate: null,
    reminderAt: null,
    recurringFrequency: null,
    reviewedAt: null,
    activeTimerStartedAt: null,
    totalElapsedSeconds: 0,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  } as Task;
}

// Independent date label (cross-checks briefing.ts's own arrays).
function dayLabel(d: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(d);
}

const OVERDUE_DUE = new Date('2026-05-29T10:00:00');
const HIGH_DUE = new Date('2026-05-31T09:00:00');
const NORMAL_DUE = new Date('2026-05-31T15:00:00');

test('assembles a morning briefing with overdue / due-today / priority labels', () => {
  const tasks = [
    makeTask({ title: 'File taxes', dueDate: OVERDUE_DUE, priority: 500 }),
    makeTask({ title: 'Call dentist', dueDate: HIGH_DUE, priority: 100 }),
    makeTask({ title: 'Water plants', dueDate: NORMAL_DUE, priority: 800 }),
  ];

  const { systemPrompt, userPrompt } = buildBriefingPrompt({ user: USER, tasks, persona: PERSONA, now: NOW });

  const expectedUser = [
    'Good morning, Ada.',
    '',
    `Today is ${dayLabel(NOW)}.`,
    '',
    '3 tasks due today or overdue, most urgent first:',
    '',
    `- File taxes — overdue (was due ${dayLabel(OVERDUE_DUE)})`,
    '- Call dentist — due today, high priority',
    '- Water plants — due today',
    '',
    'Write the briefing: a short greeting, then call out what to focus on first and why. Two or three sentences, plus the top one or two tasks if it helps. No headings.',
  ].join('\n');

  const expectedSystem = [
    PERSONA,
    '---',
    'You are writing a daily briefing for Ada. It will be delivered as a short',
    'notification/message. Be concise and specific. Use only the facts in the user',
    'message — never invent tasks, counts, or dates. Plain text, no markdown headings.',
  ].join('\n');

  assert.equal(userPrompt, expectedUser);
  assert.equal(systemPrompt, expectedSystem);

  // Trimmed / clean: no leaked placeholders, no runaway blank lines.
  assert.ok(!userPrompt.includes('undefined'));
  assert.ok(!userPrompt.includes('null'));
  assert.ok(!userPrompt.includes('\n\n\n'));
});

test('is pure: same input yields byte-identical output', () => {
  const input = {
    user: USER,
    tasks: [makeTask({ title: 'File taxes', dueDate: OVERDUE_DUE })],
    persona: PERSONA,
    now: NOW,
  };
  const a = buildBriefingPrompt(input);
  const b = buildBriefingPrompt(input);
  assert.equal(a.userPrompt, b.userPrompt);
  assert.equal(a.systemPrompt, b.systemPrompt);
});

test('handles an empty day', () => {
  const { userPrompt } = buildBriefingPrompt({ user: USER, tasks: [], persona: PERSONA, now: NOW });
  const expected = [
    'Good morning, Ada.',
    '',
    `Today is ${dayLabel(NOW)}.`,
    '',
    'Nothing is due today and nothing is overdue.',
    '',
    'Write a brief, warm note acknowledging the clear plate. One or two sentences.',
  ].join('\n');
  assert.equal(userPrompt, expected);
});

test('uses singular noun for one task and weaves in the memory seam', () => {
  const { userPrompt } = buildBriefingPrompt({
    user: USER,
    tasks: [makeTask({ title: 'Call dentist', dueDate: HIGH_DUE, priority: 100 })],
    persona: PERSONA,
    now: NOW,
    memory: 'Prefers deep work before noon.',
  });
  assert.ok(userPrompt.includes('1 task due today or overdue, most urgent first:'));
  assert.ok(userPrompt.includes('What you remember about them:\nPrefers deep work before noon.'));
});

test('weaves in the notes seam', () => {
  const { userPrompt } = buildBriefingPrompt({
    user: USER,
    tasks: [],
    persona: PERSONA,
    now: NOW,
    notes: '- Project ideas (ideas.md)\n- Trip plan (trip.md)',
  });
  assert.ok(
    userPrompt.includes('Recent notes from their vault:\n- Project ideas (ideas.md)\n- Trip plan (trip.md)'),
  );
});
