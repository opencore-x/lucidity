import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notesBackend, type WriteMode } from '@/lib/notes';

const NOTES_KEY = ['notes'] as const;

export function useNotes() {
  return useQuery({
    queryKey: NOTES_KEY,
    queryFn: () => notesBackend.list(),
  });
}

export function useNote(path: string) {
  return useQuery({
    queryKey: ['notes', path],
    queryFn: () => notesBackend.read(path),
    enabled: !!path,
  });
}

export function useSearchNotes(query: string) {
  return useQuery({
    queryKey: ['notes', 'search', query],
    queryFn: () => notesBackend.search(query),
    enabled: query.trim().length > 0,
  });
}

export function useWriteNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ path, content, mode }: { path: string; content: string; mode?: WriteMode }) =>
      notesBackend.write(path, content, mode),
    onSettled: (_data, _err, vars) => {
      queryClient.invalidateQueries({ queryKey: NOTES_KEY });
      if (vars?.path) queryClient.invalidateQueries({ queryKey: ['notes', vars.path] });
    },
  });
}

export function useEditNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      path,
      oldString,
      newString,
      replaceAll,
    }: {
      path: string;
      oldString: string;
      newString: string;
      replaceAll?: boolean;
    }) => notesBackend.edit(path, oldString, newString, replaceAll),
    onSettled: (_data, _err, vars) => {
      queryClient.invalidateQueries({ queryKey: NOTES_KEY });
      if (vars?.path) queryClient.invalidateQueries({ queryKey: ['notes', vars.path] });
    },
  });
}
