import * as React from 'react';
import {
  View,
  ActivityIndicator,
  type NativeSyntheticEvent,
  type TextInputChangeEventData,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Host, ZStack, List, Section, HStack, Image, Text as UIText } from '@expo/ui/swift-ui';
import {
  listStyle,
  refreshable,
  frame,
  foregroundStyle,
  font,
  contentShape,
  shapes,
  onTapGesture,
  lineLimit,
  scrollDismissesKeyboard,
  padding,
} from '@expo/ui/swift-ui/modifiers';
import { useColorScheme } from '@/hooks/useColorScheme';
import { layout } from '@/lib/layout';
import { COLORS } from '@/lib/theme';
import { UserMenu } from '@/components/user-menu';
import { HeaderGlassButton } from '@/components/native/HeaderGlassButton';
import { TaskRow } from '@/components/native/TaskRow';
import { TaskComposer } from '@/components/native/TaskComposer';
import { useTasks, useCreateTask, useToggleTask } from '@/hooks/useTasks';
import { useProjects } from '@/hooks/useProjects';
import { useSheetStore } from '@/stores/sheetStore';
import { getSubtaskProgress } from '@/utils/helpers';
import type { Task, Project } from '@lucidity/shared';

const MUTED_GRAY = '#8E8E93';

/** A native search result row for a matching project (dot + name + task count). */
function ProjectResultRow({
  project,
  taskCount,
  onPress,
}: {
  project: Project;
  taskCount: number;
  onPress: () => void;
}) {
  return (
    <HStack spacing={10} modifiers={[contentShape(shapes.rectangle()), onTapGesture(onPress)]}>
      <Image
        key={project.color ?? 'none'}
        systemName="circle.fill"
        size={12}
        color={project.color ?? MUTED_GRAY}
      />
      <UIText modifiers={[lineLimit(1), frame({ maxWidth: Infinity, alignment: 'leading' })]}>
        {project.name}
      </UIText>
      <UIText modifiers={[foregroundStyle(MUTED_GRAY), font({ size: 13 })]}>
        {`${taskCount} tasks`}
      </UIText>
      <Image systemName="chevron.right" size={12} color={MUTED_GRAY} />
    </HStack>
  );
}

export default function SearchScreen() {
  const { colorScheme } = useColorScheme();
  const scheme = colorScheme === 'dark' ? 'dark' : 'light';
  const router = useRouter();

  const { data: tasks = [], isLoading: tasksLoading, refetch: refetchTasks } = useTasks();
  const {
    data: allProjects = [],
    isLoading: projectsLoading,
    refetch: refetchProjects,
  } = useProjects();
  const createTask = useCreateTask();
  const toggleTask = useToggleTask();
  const { openSheet } = useSheetStore();

  const projects = React.useMemo(() => allProjects.filter((p) => !p.isArchived), [allProjects]);
  const isLoading = tasksLoading || projectsLoading;

  const [query, setQuery] = React.useState('');
  const [composing, setComposing] = React.useState(false);

  const onRefresh = React.useCallback(async () => {
    await Promise.all([refetchTasks(), refetchProjects()]);
  }, [refetchTasks, refetchProjects]);

  const filteredTasks = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return tasks.filter(
      (task) =>
        !task.parentTaskId &&
        (task.title.toLowerCase().includes(q) ||
          (task.description?.toLowerCase().includes(q) ?? false))
    );
  }, [tasks, query]);

  const filteredProjects = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return projects.filter((p) => p.name.toLowerCase().includes(q));
  }, [projects, query]);

  const recentTasks = React.useMemo(
    () =>
      tasks
        .filter((t) => !t.parentTaskId && t.status !== 'completed')
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 20),
    [tasks]
  );

  const projectTaskCounts = React.useMemo(() => {
    const counts = new Map<string, number>();
    tasks.forEach((t) => {
      if (t.projectId && !t.parentTaskId && t.status !== 'completed') {
        counts.set(t.projectId, (counts.get(t.projectId) ?? 0) + 1);
      }
    });
    return counts;
  }, [tasks]);

  const handleTaskPress = React.useCallback((task: Task) => openSheet(task), [openSheet]);
  const handleTaskToggle = React.useCallback(
    (taskId: string) => toggleTask.mutate(taskId),
    [toggleTask]
  );
  // Native iOS search bar (UISearchController) rendered in the nav area via the Stack
  // header. autoFocus makes iOS focus it and open the keyboard when the screen appears —
  // reliable where a custom TextField in a List under a native search-role tab was not.
  const searchBarOptions = React.useMemo(
    () => ({
      placeholder: 'Search ...',
      autoFocus: true,
      hideWhenScrolling: false,
      onChangeText: (e: NativeSyntheticEvent<TextInputChangeEventData>) =>
        setQuery(e.nativeEvent.text),
      onCancelButtonPress: () => setQuery(''),
    }),
    []
  );

  const handleCreateTask = React.useCallback(() => setComposing(true), []);
  const handleSubmitTask = React.useCallback(
    (title: string) => createTask.mutate({ title }),
    [createTask]
  );

  const headerRight = React.useCallback(
    () => (
      <View style={layout.headerActions}>
        <HeaderGlassButton systemImage="plus" onPress={handleCreateTask} />
        <UserMenu />
      </View>
    ),
    [handleCreateTask]
  );

  const renderTaskRow = (task: Task) => (
    <TaskRow
      key={task.id}
      task={task}
      progress={getSubtaskProgress(tasks, task.id)}
      onToggle={() => handleTaskToggle(task.id)}
      onOpen={() => handleTaskPress(task)}
    />
  );

  if (isLoading) {
    return (
      <>
        <Stack.Screen
          options={{ title: 'Search', headerRight, headerSearchBarOptions: searchBarOptions }}
        />
        <View style={[layout.center, { backgroundColor: COLORS[scheme].background }]}>
          <ActivityIndicator size="large" />
        </View>
      </>
    );
  }

  const hasQuery = query.trim().length > 0;
  const noResults = hasQuery && filteredTasks.length === 0 && filteredProjects.length === 0;

  return (
    <>
      <Stack.Screen options={{ title: 'Search', headerRight }} />
      <View style={[layout.flex1, { backgroundColor: COLORS[scheme].background }]}>
        <Host style={{ flex: 1 }} colorScheme={scheme}>
          <ZStack
            alignment="bottom"
            modifiers={[frame({ maxWidth: Infinity, maxHeight: Infinity })]}>
            <List
              modifiers={[
                listStyle('insetGrouped'),
                refreshable(onRefresh),
                scrollDismissesKeyboard('interactively'),
              ]}>
              {hasQuery ? (
                <>
                  {filteredProjects.length > 0 ? (
                    <Section title={`Projects (${filteredProjects.length})`}>
                      {filteredProjects.map((project) => (
                        <ProjectResultRow
                          key={project.id}
                          project={project}
                          taskCount={projectTaskCounts.get(project.id) ?? 0}
                          onPress={() => router.push(`/project/${project.id}`)}
                        />
                      ))}
                    </Section>
                  ) : null}

                  {filteredTasks.length > 0 ? (
                    <Section title={`Tasks (${filteredTasks.length})`}>
                      {filteredTasks.map(renderTaskRow)}
                    </Section>
                  ) : null}

                  {noResults ? (
                    <UIText
                      modifiers={[
                        foregroundStyle(MUTED_GRAY),
                        frame({ maxWidth: Infinity, alignment: 'center' }),
                        padding({ vertical: 48 }),
                      ]}>
                      {`No results for "${query.trim()}"`}
                    </UIText>
                  ) : null}
                </>
              ) : (
                <Section title="Recent">
                  {recentTasks.length > 0 ? (
                    recentTasks.map(renderTaskRow)
                  ) : (
                    <UIText
                      modifiers={[
                        foregroundStyle(MUTED_GRAY),
                        frame({ maxWidth: Infinity, alignment: 'center' }),
                        padding({ vertical: 48 }),
                      ]}>
                      No tasks yet
                    </UIText>
                  )}
                </Section>
              )}
            </List>

            {composing ? (
              <TaskComposer
                placeholder="Add task…"
                onSubmit={handleSubmitTask}
                onClose={() => setComposing(false)}
                surface
              />
            ) : null}
          </ZStack>
        </Host>
      </View>
    </>
  );
}
