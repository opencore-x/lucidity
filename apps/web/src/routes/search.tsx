import * as React from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Search, FolderOpen } from 'lucide-react';
import { apiClient } from '~/api/client';
import { useAuthReady } from '~/providers/ApiProvider';
import { useTasks, useToggleTask } from '~/hooks/useTasks';
import { TaskItem } from '~/components/task-item';
import { TaskPanel } from '~/components/task-panel';
import type { Task, Project } from '@lucidity/shared';

export const Route = createFileRoute('/search')({
  component: SearchPage,
});

function useSearch(query: string) {
  const authReady = useAuthReady();
  return useQuery({
    queryKey: ['search', query],
    queryFn: () =>
      apiClient<{ tasks: Task[]; projects: Project[] }>(
        `/api/search?q=${encodeURIComponent(query)}`,
      ),
    enabled: authReady && query.length >= 2,
    placeholderData: (prev) => prev,
  });
}

function useDebounce<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return debounced;
}

function SearchPage() {
  const [query, setQuery] = React.useState('');
  const debouncedQuery = useDebounce(query.trim(), 500);
  const searchQuery = useSearch(debouncedQuery);
  const tasksQuery = useTasks();
  const toggleTask = useToggleTask();
  const [selectedTaskId, setSelectedTaskId] = React.useState<string | null>(
    null,
  );
  const inputRef = React.useRef<HTMLInputElement>(null);

  const allTasks = tasksQuery.data ?? [];
  const results = searchQuery.data;
  const tasks = results?.tasks ?? [];
  const projects = results?.projects ?? [];
  const hasQuery = debouncedQuery.length >= 2;
  const isSearching = searchQuery.isFetching;

  React.useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold tracking-tight">Search</h1>

      {/* Search input */}
      <div className="relative mt-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="search"
          className="h-10 w-full rounded-md border bg-transparent pl-10 pr-4 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* Results */}
      <div className="mt-6 flex flex-col gap-6">
        {!hasQuery && (
          <p className="text-sm text-muted-foreground">
            Type at least 2 characters to search.
          </p>
        )}

        {hasQuery &&
          !isSearching &&
          tasks.length === 0 &&
          projects.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No results for "{debouncedQuery}".
            </p>
          )}

        {/* Project results */}
        {projects.length > 0 && (
          <div>
            <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Projects ({projects.length})
            </h2>
            <div className="flex flex-col gap-1">
              {projects.map((project) => (
                <Link
                  key={project.id}
                  to="/projects/$id"
                  params={{ id: project.id }}
                  className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-accent/50"
                >
                  <FolderOpen className="h-4 w-4 text-muted-foreground" />
                  <span
                    className="text-sm font-medium"
                    style={project.color ? { color: project.color } : undefined}
                  >
                    {project.name}
                  </span>
                  {project.description && (
                    <span className="truncate text-xs text-muted-foreground">
                      {project.description}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Task results */}
        {tasks.length > 0 && (
          <div>
            <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Tasks ({tasks.length})
            </h2>
            <div className="rounded-lg border bg-card">
              <div className="px-1 py-1">
                {tasks.map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    allTasks={allTasks}
                    onToggle={(id) => toggleTask.mutate(id)}
                    onClick={(task) => setSelectedTaskId(task.id)}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <TaskPanel
        taskId={selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
        allTasks={allTasks}
      />
    </div>
  );
}
