import { sandboxBackend } from './sandboxBackend';
import type { NotesBackend } from './types';

/**
 * The active notes backend. Today it's the local app-sandbox stub; once the
 * iCloud-container native module lands, swap this one line — every screen and
 * hook keeps working against the same `NotesBackend` interface.
 */
export const notesBackend: NotesBackend = sandboxBackend;

export type { NotesBackend, NoteSummary, NoteContent, SearchHit, WriteMode } from './types';
