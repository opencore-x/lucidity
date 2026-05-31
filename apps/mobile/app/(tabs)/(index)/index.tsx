import { Icon } from '@/components/ui/icon';
import { UserMenu } from '@/components/user-menu';
import { PlusIcon } from 'lucide-react-native';
import * as React from 'react';
import { View, ActivityIndicator, Alert, Pressable } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Host, List, HStack, Text, Image, Spacer } from '@expo/ui/swift-ui';
import {
  listStyle,
  onTapGesture,
  contentShape,
  shapes,
  foregroundStyle,
  refreshable,
  deleteDisabled,
} from '@expo/ui/swift-ui/modifiers';
import { useColorScheme } from 'nativewind';
import { useTasks } from '@/hooks/useTasks';
import { useProjects, useCreateProject } from '@/hooks/useProjects';
import { useConfirmDeleteProject } from '@/hooks/useConfirmDeleteProject';
import { groupTasksByProject, INBOX_PROJECT_ID } from '@/utils/helpers';
import type { Project } from '@lucidity/shared';

// Secondary gray for the trailing count + the Inbox/no-color dot (systemGray).
const MUTED_GRAY = '#8E8E93';

type ProjectRowData = { project: Project; total: number; completed: number };

/**
 * One project row: a color dot (gray for Inbox / colorless projects), the name,
 * and a completed/total count. The whole row is tappable via `contentShape` +
 * `onTapGesture`. `canDelete=false` (Inbox) disables the swipe-to-delete on this
 * row while keeping it in the same ForEach (so all rows share one inset card).
 */
function ProjectRow({
  row,
  canDelete,
  onPress,
}: {
  row: ProjectRowData;
  canDelete: boolean;
  onPress: () => void;
}) {
  const { project, total, completed } = row;
  return (
    <HStack
      spacing={12}
      modifiers={[
        contentShape(shapes.rectangle()),
        onTapGesture(onPress),
        ...(canDelete ? [] : [deleteDisabled(true)]),
      ]}>
      <Image systemName="circle.fill" size={12} color={project.color ?? MUTED_GRAY} />
      <Text>{project.name}</Text>
      <Spacer />
      <Text modifiers={[foregroundStyle(MUTED_GRAY)]}>{`${completed}/${total}`}</Text>
    </HStack>
  );
}

/**
 * Projects landing — a native @expo/ui `List` of tappable project rows (replaces
 * the old accordion ProjectGroup stack). Inbox sorts first and opens its own
 * detail view; real projects open `/project/[id]`. Pull-to-refresh via the native
 * `refreshable` modifier; swipe-to-delete (confirm first — cascades to all tasks)
 * via `List.ForEach` `onDelete`, with Inbox excluded. The project editor lives on
 * the detail screen (Phase 3); this screen is pure navigation + create/delete.
 */
export default function ProjectsScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const scheme = colorScheme === 'dark' ? 'dark' : 'light';

  const { data: tasks = [], isLoading: tasksLoading, refetch: refetchTasks } = useTasks();
  const {
    data: allProjects = [],
    isLoading: projectsLoading,
    refetch: refetchProjects,
  } = useProjects();
  const createProject = useCreateProject();
  const confirmDeleteProject = useConfirmDeleteProject();

  const projects = React.useMemo(() => allProjects.filter((p) => !p.isArchived), [allProjects]);
  const isLoading = tasksLoading || projectsLoading;

  // Inbox first, then projects (groupTasksByProject sorts + buckets root tasks).
  // Count mirrors the old header: root tasks only (no subtasks).
  const rows = React.useMemo<ProjectRowData[]>(() => {
    const grouped = groupTasksByProject(tasks, projects);
    return Array.from(grouped.entries()).map(([project, projectTasks]) => ({
      project,
      total: projectTasks.length,
      completed: projectTasks.filter((t) => t.status === 'completed').length,
    }));
  }, [tasks, projects]);

  const onRefresh = React.useCallback(async () => {
    await Promise.all([refetchTasks(), refetchProjects()]);
  }, [refetchTasks, refetchProjects]);

  const handleCreateProject = React.useCallback(() => {
    Alert.prompt(
      'New Project',
      undefined,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add Project',
          onPress: (name?: string) => {
            if (name?.trim()) createProject.mutate({ name: name.trim(), isArchived: false });
          },
        },
      ],
      'plain-text'
    );
  }, [createProject]);

  const headerRight = React.useCallback(
    () => (
      <View className="flex-row items-center gap-4">
        <Pressable onPress={handleCreateProject} hitSlop={8} className="pl-2">
          <Icon as={PlusIcon} className="size-6 text-foreground" />
        </Pressable>
        <UserMenu />
      </View>
    ),
    [handleCreateProject]
  );

  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Projects', headerRight }} />
        <View className="flex-1 items-center justify-center bg-background">
          <ActivityIndicator size="large" />
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Projects', headerRight }} />
      <View className="flex-1 bg-background">
        <Host style={{ flex: 1 }} colorScheme={scheme}>
          <List modifiers={[listStyle('insetGrouped'), refreshable(onRefresh)]}>
            <List.ForEach
              onDelete={(indices) =>
                indices.forEach((i) => {
                  const r = rows[i];
                  if (r && r.project.id !== INBOX_PROJECT_ID) {
                    confirmDeleteProject(r.project, r.total);
                  }
                })
              }>
              {rows.map((r) => (
                <ProjectRow
                  key={r.project.id}
                  row={r}
                  canDelete={r.project.id !== INBOX_PROJECT_ID}
                  onPress={() => router.push(`/project/${r.project.id}`)}
                />
              ))}
            </List.ForEach>
          </List>
        </Host>
      </View>
    </>
  );
}
