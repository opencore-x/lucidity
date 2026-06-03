import { UserMenu } from '@/components/user-menu';
import { HeaderGlassButton } from '@/components/native/HeaderGlassButton';
import { TaskComposer } from '@/components/native/TaskComposer';
import * as React from 'react';
import { View, ActivityIndicator, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import {
  Host,
  ZStack,
  List,
  HStack,
  Text,
  Image,
  Spacer,
  SwipeActions,
  Button,
} from '@expo/ui/swift-ui';
import {
  listStyle,
  onTapGesture,
  contentShape,
  shapes,
  foregroundStyle,
  refreshable,
  tint,
  frame,
  scrollDismissesKeyboard,
} from '@expo/ui/swift-ui/modifiers';
import { useColorScheme } from 'nativewind';
import { useTasks } from '@/hooks/useTasks';
import { useProjects, useCreateProject, useDeleteProject } from '@/hooks/useProjects';
import { useProjectSheetStore } from '@/stores/projectSheetStore';
import { groupTasksByProject, INBOX_PROJECT_ID } from '@/utils/helpers';
import type { Project } from '@lucidity/shared';

// Secondary gray for the trailing count + the Inbox/no-color dot (systemGray).
const MUTED_GRAY = '#8E8E93';
// Amber-yellow for the Edit swipe action (sits just before Delete on the trailing edge).
const EDIT_YELLOW = '#F59E0B';

type ProjectRowData = { project: Project; total: number; completed: number };

/**
 * One project row: a color dot (gray for Inbox / colorless projects), the name,
 * and a trailing count of remaining (uncompleted) tasks — hidden when none are left.
 * The whole row is tappable via `contentShape` + `onTapGesture`. Swipe actions
 * (Edit / Delete) are attached by the parent.
 */
function ProjectRow({ row, onPress }: { row: ProjectRowData; onPress: () => void }) {
  const { project, total, completed } = row;
  const remaining = total - completed;
  return (
    <HStack spacing={12} modifiers={[contentShape(shapes.rectangle()), onTapGesture(onPress)]}>
      {/* key on the color so the native Image re-paints when the color changes
          (the SwiftUI color prop can otherwise stick to its first value). */}
      <Image
        key={project.color ?? 'none'}
        systemName="circle.fill"
        size={12}
        color={project.color ?? MUTED_GRAY}
      />
      <Text>{project.name}</Text>
      <Spacer />
      {remaining > 0 ? (
        <Text modifiers={[foregroundStyle(MUTED_GRAY)]}>{String(remaining)}</Text>
      ) : null}
    </HStack>
  );
}

/**
 * Projects landing — a native @expo/ui `List` of tappable project rows (replaces
 * the old accordion ProjectGroup stack). Inbox sorts first and opens its own detail
 * view; real projects open `/project/[id]`. Pull-to-refresh via `refreshable`. Each
 * real project carries native swipe actions: Edit (opens the project editor) and
 * Delete (confirm first — cascades to all tasks). Inbox has no swipe actions.
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
  const deleteProject = useDeleteProject();
  const openProjectSheet = useProjectSheetStore((s) => s.openSheet);
  const [composing, setComposing] = React.useState(false);

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

  const handleCreateProject = React.useCallback(() => setComposing(true), []);
  const handleSubmitProject = React.useCallback(
    (name: string) => createProject.mutate({ name, isArchived: false }),
    [createProject]
  );

  // Swipe-to-delete a project — confirm first (cascades to all its tasks). A custom
  // swipe Button doesn't auto-remove the row, so the optimistic removal in
  // useDeleteProject runs only on confirm; Cancel simply leaves the row.
  const handleDeleteProject = React.useCallback(
    (row: ProjectRowData) => {
      Alert.alert(
        'Delete Project',
        `Delete "${row.project.name}" and all ${row.total} of its tasks?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => deleteProject.mutate(row.project.id),
          },
        ]
      );
    },
    [deleteProject]
  );

  const headerRight = React.useCallback(
    () => (
      <View className="flex-row items-center gap-2">
        <HeaderGlassButton systemImage="plus" onPress={handleCreateProject} />
        <UserMenu />
      </View>
    ),
    [handleCreateProject]
  );

  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Projects', headerRight }} />
        <View className="bg-background flex-1 items-center justify-center">
          <ActivityIndicator size="large" />
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Projects', headerRight }} />
      <View className="bg-background flex-1">
        <Host style={{ flex: 1 }} colorScheme={scheme}>
          {/* ZStack so the List fills the Host behind the translucent glass composer —
              same pattern as the project / Today screens. */}
          <ZStack
            alignment="bottom"
            modifiers={[frame({ maxWidth: Infinity, maxHeight: Infinity })]}>
            <List
              modifiers={[
                listStyle('insetGrouped'),
                refreshable(onRefresh),
                scrollDismissesKeyboard('interactively'),
              ]}>
              {rows.map((r) => {
                const isInbox = r.project.id === INBOX_PROJECT_ID;
                const open = () => router.push(`/project/${r.project.id}`);

                // Inbox can't be edited or deleted — render it without swipe actions.
                if (isInbox) {
                  return <ProjectRow key={r.project.id} row={r} onPress={open} />;
                }

                return (
                  <SwipeActions key={r.project.id}>
                    <ProjectRow row={r} onPress={open} />
                    {/* Both actions on the trailing edge: Delete at the edge, Edit
                      (yellow) just before it. */}
                    <SwipeActions.Actions edge="trailing" allowsFullSwipe={false}>
                      <Button
                        label="Delete"
                        systemImage="trash"
                        role="destructive"
                        onPress={() => handleDeleteProject(r)}
                      />
                      <Button
                        label="Edit"
                        systemImage="pencil"
                        onPress={() => openProjectSheet(r.project)}
                        modifiers={[tint(EDIT_YELLOW)]}
                      />
                    </SwipeActions.Actions>
                  </SwipeActions>
                );
              })}
            </List>
            {composing ? (
              <TaskComposer
                placeholder="Add project…"
                onSubmit={handleSubmitProject}
                onClose={() => setComposing(false)}
              />
            ) : null}
          </ZStack>
        </Host>
      </View>
    </>
  );
}
