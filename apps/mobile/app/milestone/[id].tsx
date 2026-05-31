import * as React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import {
  Host,
  ZStack,
  HStack,
  Spacer,
  Button,
  List,
  Section,
  SwipeActions,
  ProgressView,
  Text as UIText,
} from '@expo/ui/swift-ui';
import {
  buttonStyle,
  tint,
  controlSize,
  padding,
  listStyle,
  listRowSeparator,
  refreshable,
  frame,
  foregroundStyle,
  font,
  scrollDismissesKeyboard,
} from '@expo/ui/swift-ui/modifiers';
import { useColorScheme } from 'nativewind';
import { useQueryClient } from '@tanstack/react-query';
import { Text } from '@/components/ui/text';
import { UserMenu } from '@/components/user-menu';
import { HeaderGlassButton } from '@/components/native/HeaderGlassButton';
import { TaskRow } from '@/components/native/TaskRow';
import { TaskComposer } from '@/components/native/TaskComposer';
import { LARGE_TITLE_SCREEN_OPTIONS } from '@/lib/headerConfig';
import { useProjects } from '@/hooks/useProjects';
import { useAllMilestones, useMilestoneProgress } from '@/hooks/useMilestones';
import { useTasks, useCreateTask, useToggleTask, useUpdateTask } from '@/hooks/useTasks';
import { useUndoableDeleteTask } from '@/hooks/useUndoableDeleteTask';
import { useSheetStore } from '@/stores/sheetStore';
import { getSubtaskProgress } from '@/utils/helpers';
import type { Task } from '@lucidity/shared';

const MUTED_GRAY = '#8E8E93';
const TODAY_AMBER = '#F59E0B';
const PROGRESS_BLUE = '#3B82F6';
const DONE_GREEN = '#22C55E';

// Milestone names are long ("M1: Core Platform + Visitor Management"), so use a
// standard (non-large) nav title — it truncates with an ellipsis instead of
// overflowing the large-title area.
const MILESTONE_HEADER = { ...LARGE_TITLE_SCREEN_OPTIONS, headerLargeTitle: false } as const;

export default function MilestoneScreen() {
  const { colorScheme } = useColorScheme();
  const scheme = colorScheme === 'dark' ? 'dark' : 'light';

  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: allMilestones = [], isLoading: milestonesLoading } = useAllMilestones();
  const { data: allProjects = [] } = useProjects();
  const milestone = React.useMemo(
    () => allMilestones.find((m) => m.id === id),
    [allMilestones, id]
  );
  const project = React.useMemo(
    () => allProjects.find((p) => p.id === milestone?.projectId),
    [allProjects, milestone]
  );

  const { data: allTasks = [], isLoading: tasksLoading, refetch: refetchTasks } = useTasks();
  const { data: progress } = useMilestoneProgress(id);
  const createTask = useCreateTask();
  const toggleTask = useToggleTask();
  const updateTask = useUpdateTask();
  const { deleteTask } = useUndoableDeleteTask();
  const { openSheet } = useSheetStore();
  const queryClient = useQueryClient();

  const [selectedTab, setSelectedTab] = React.useState<'active' | 'completed'>('active');
  const [composing, setComposing] = React.useState(false);

  const rootTasks = React.useMemo(
    () => allTasks.filter((t) => t.milestoneId === id && !t.parentTaskId),
    [allTasks, id]
  );
  const activeTasks = React.useMemo(
    () => rootTasks.filter((t) => t.status !== 'completed'),
    [rootTasks]
  );
  const completedTasks = React.useMemo(
    () =>
      rootTasks
        .filter((t) => t.status === 'completed')
        .sort(
          (a, b) => new Date(b.completedAt ?? 0).getTime() - new Date(a.completedAt ?? 0).getTime()
        ),
    [rootTasks]
  );

  const onRefresh = React.useCallback(async () => {
    queryClient.invalidateQueries({ queryKey: ['milestoneProgress'] });
    await refetchTasks();
  }, [refetchTasks, queryClient]);

  const handleTaskPress = React.useCallback((task: Task) => openSheet(task), [openSheet]);
  const handleTaskToggle = React.useCallback(
    (taskId: string) => toggleTask.mutate(taskId),
    [toggleTask]
  );
  const handleDeleteTask = React.useCallback((taskId: string) => deleteTask(taskId), [deleteTask]);
  const handleSetDueToday = React.useCallback(
    (taskId: string) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      updateTask.mutate({ id: taskId, data: { dueDate: today } });
    },
    [updateTask]
  );

  const handleCreateTask = React.useCallback(() => setComposing(true), []);
  const handleSubmitTask = React.useCallback(
    (title: string) => {
      if (milestone) {
        createTask.mutate({ title, projectId: milestone.projectId, milestoneId: milestone.id });
      }
    },
    [createTask, milestone]
  );

  const isLoading = milestonesLoading || tasksLoading;

  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ ...MILESTONE_HEADER, title: '' }} />
        <View className="bg-background flex-1 items-center justify-center">
          <ActivityIndicator size="large" />
        </View>
      </>
    );
  }

  if (!milestone) {
    return (
      <>
        <Stack.Screen options={{ ...MILESTONE_HEADER, title: 'Not Found' }} />
        <View className="bg-background flex-1 items-center justify-center">
          <Text className="text-muted-foreground">Milestone not found</Text>
        </View>
      </>
    );
  }

  const percent = progress?.percent ?? 0;
  const completed = progress?.completed ?? 0;
  const total = progress?.total ?? 0;

  const tabButton = (tab: 'active' | 'completed', label: string) => (
    <Button
      label={label}
      onPress={() => setSelectedTab(tab)}
      modifiers={[
        controlSize('regular'),
        buttonStyle(selectedTab === tab ? 'glassProminent' : 'glass'),
        ...(project?.color ? [tint(project.color)] : []),
      ]}
    />
  );

  return (
    <>
      <Stack.Screen
        options={{
          ...MILESTONE_HEADER,
          title: milestone.name,
          headerTintColor: project?.color ?? undefined,
          headerRight: () => (
            <View className="flex-row items-center gap-2">
              <HeaderGlassButton systemImage="plus" onPress={handleCreateTask} />
              <UserMenu />
            </View>
          ),
        }}
      />
      <View className="bg-background flex-1">
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
              {/* Progress lives in its own card. */}
              <Section>
                <HStack spacing={8}>
                  <UIText modifiers={[foregroundStyle(MUTED_GRAY), font({ size: 12 })]}>
                    {`${completed}/${total}`}
                  </UIText>
                  <ProgressView
                    value={percent / 100}
                    modifiers={[
                      tint(percent >= 100 ? DONE_GREEN : PROGRESS_BLUE),
                      frame({ maxWidth: Infinity }),
                    ]}
                  />
                  <UIText modifiers={[foregroundStyle(MUTED_GRAY), font({ size: 12 })]}>
                    {`${percent}%`}
                  </UIText>
                </HStack>
              </Section>

              {/* Tabs + the task list form the second card. */}
              <Section>
                <HStack spacing={8} modifiers={[listRowSeparator('hidden')]}>
                  {tabButton('active', `Active (${activeTasks.length})`)}
                  {tabButton('completed', `Completed (${completedTasks.length})`)}
                  <Spacer />
                </HStack>

                {selectedTab === 'active' ? (
                  activeTasks.length === 0 ? (
                    <UIText
                      modifiers={[
                        foregroundStyle(MUTED_GRAY),
                        frame({ maxWidth: Infinity, alignment: 'center' }),
                        padding({ vertical: 40 }),
                      ]}>
                      No active tasks
                    </UIText>
                  ) : (
                    activeTasks.map((task) => (
                      <SwipeActions key={task.id}>
                        <TaskRow
                          task={task}
                          progress={getSubtaskProgress(allTasks, task.id)}
                          onToggle={() => handleTaskToggle(task.id)}
                          onOpen={() => handleTaskPress(task)}
                        />
                        <SwipeActions.Actions edge="trailing" allowsFullSwipe={false}>
                          <Button
                            label="Delete"
                            systemImage="trash"
                            role="destructive"
                            onPress={() => handleDeleteTask(task.id)}
                          />
                          <Button
                            label="Today"
                            systemImage="calendar"
                            onPress={() => handleSetDueToday(task.id)}
                            modifiers={[tint(TODAY_AMBER)]}
                          />
                        </SwipeActions.Actions>
                      </SwipeActions>
                    ))
                  )
                ) : completedTasks.length === 0 ? (
                  <UIText
                    modifiers={[
                      foregroundStyle(MUTED_GRAY),
                      frame({ maxWidth: Infinity, alignment: 'center' }),
                      padding({ vertical: 40 }),
                    ]}>
                    No completed tasks
                  </UIText>
                ) : (
                  completedTasks.map((task) => (
                    <SwipeActions key={task.id}>
                      <TaskRow
                        task={task}
                        progress={getSubtaskProgress(allTasks, task.id)}
                        onToggle={() => handleTaskToggle(task.id)}
                        onOpen={() => handleTaskPress(task)}
                      />
                      <SwipeActions.Actions edge="trailing">
                        <Button
                          label="Delete"
                          systemImage="trash"
                          role="destructive"
                          onPress={() => handleDeleteTask(task.id)}
                        />
                      </SwipeActions.Actions>
                    </SwipeActions>
                  ))
                )}
              </Section>
            </List>

            {composing ? (
              <TaskComposer
                placeholder="Add task…"
                onSubmit={handleSubmitTask}
                onClose={() => setComposing(false)}
              />
            ) : null}
          </ZStack>
        </Host>
      </View>
    </>
  );
}
