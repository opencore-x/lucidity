export type WriteMode = 'create' | 'append' | 'overwrite';

export interface NoteSummary {
  /** Path relative to the vault root, posix-style. */
  path: string;
  title: string;
  /** Last-modified time, ms since epoch. */
  modifiedAt: number;
}

export interface NoteContent extends NoteSummary {
  frontmatter: Record<string, unknown>;
  body: string;
  /** Raw file contents (frontmatter + body). */
  content: string;
}

export interface SearchHit {
  path: string;
  /** 1-based line number. */
  line: number;
  snippet: string;
}

/**
 * The mobile notes vault contract. Implemented today by a local app-sandbox
 * stub (`expo-file-system`) so the UI is buildable without iCloud; the native
 * iCloud-container module will implement the SAME interface later, so swapping
 * the backend leaves every screen untouched. All methods are async so a
 * coordinated (iCloud) backend fits the same shape.
 */
export interface NotesBackend {
  list(opts?: { limit?: number }): Promise<NoteSummary[]>;
  read(path: string): Promise<NoteContent>;
  /** `create` (default) refuses to clobber; `append` adds to the end; `overwrite` replaces. */
  write(path: string, content: string, mode?: WriteMode): Promise<NoteSummary>;
  /** Surgical find/replace; throws if `oldString` is absent or (without `replaceAll`) not unique. */
  edit(path: string, oldString: string, newString: string, replaceAll?: boolean): Promise<NoteSummary>;
  search(query: string, opts?: { limit?: number }): Promise<SearchHit[]>;
}
