import * as React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import {
  Host,
  ZStack,
  VStack,
  HStack,
  ScrollView,
  Button,
  List,
  Section,
  SwipeActions,
  ProgressView,
  Text as UIText,
} from '@expo/ui/swift-ui';
import {
  tint,
  padding,
  listStyle,
  listRowSeparator,
  refreshable,
  frame,
  foregroundStyle,
  font,
  scrollDismissesKeyboard,
  scrollIndicators,
} from '@expo/ui/swift-ui/modifiers';
import { useColorScheme } from 'nativewind';
import { useQueryClient } from '@tanstack/react-query';
import { Text } from '@/components/ui/text';
import { UserMenu } from '@/components/user-menu';
import { HeaderGlassButton } from '@/components/native/HeaderGlassButton';
import { TaskRow } from '@/components/native/TaskRow';
import { TaskComposer } from '@/components/native/TaskComposer';
import { SegmentTab } from '@/components/native/SegmentTab';
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

// Milestone names are long ("M1: Core Platform + Visitor Management") and don't fit
// the nav bar OR the large-title area without truncating. So the nav title is the
// short project name, and the milestone name lives as a wrapping title in the content.
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

  const [selectedTab, setSelectedTab] = React.useState<'active' | 'deferred' | 'completed'>(
    'active'
  );
  const [composing, setComposing] = React.useState(false);

  const rootTasks = React.useMemo(
    () => allTasks.filter((t) => t.milestoneId === id && !t.parentTaskId),
    [allTasks, id]
  );
  const activeTasks = React.useMemo(
    () => rootTasks.filter((t) => t.status !== 'completed' && t.status !== 'deferred'),
    [rootTasks]
  );
  const deferredTasks = React.useMemo(
    () => rootTasks.filter((t) => t.status === 'deferred'),
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
  const due = milestone.dueDate
    ? new Date(milestone.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null;

  const tabTasks =
    selectedTab === 'active'
      ? activeTasks
      : selectedTab === 'deferred'
        ? deferredTasks
        : completedTasks;
  const emptyLabel =
    selectedTab === 'active'
      ? 'No active tasks'
      : selectedTab === 'deferred'
        ? 'No deferred tasks'
        : 'No completed tasks';
  // Completed rows get a single full-swipe Delete; active/deferred rows also offer "Today".
  const showTodayAction = selectedTab !== 'completed';

  return (
    <>
      <Stack.Screen
        options={{
          ...MILESTONE_HEADER,
          title: project?.name ?? 'Milestone',
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
              {/* Milestone name as a wrapping title card — long names don't fit the
                  nav bar (which shows the short project name). */}
              <Section>
                <VStack spacing={4} alignment="leading">
                  <UIText modifiers={[font({ size: 22, weight: 'semibold' })]}>
                    {milestone.name}
                  </UIText>
                  {due ? (
                    <UIText modifiers={[foregroundStyle(MUTED_GRAY), font({ size: 13 })]}>
                      {`Due ${due}`}
                    </UIText>
                  ) : null}
                </VStack>
              </Section>

              {/* Tabs + the task list. */}
              <Section>
                <ScrollView
                  axes="horizontal"
                  modifiers={[listRowSeparator('hidden'), scrollIndicators('hidden')]}>
                  <HStack spacing={8}>
                    <SegmentTab
                      label="Active"
                      count={activeTasks.length}
                      selected={selectedTab === 'active'}
                      onPress={() => setSelectedTab('active')}
                      tintColor={project?.color}
                    />
                    <SegmentTab
                      label="Completed"
                      count={completedTasks.length}
                      selected={selectedTab === 'completed'}
                      onPress={() => setSelectedTab('completed')}
                      tintColor={project?.color}
                    />
                    <SegmentTab
                      label="Deferred"
                      count={deferredTasks.length}
                      selected={selectedTab === 'deferred'}
                      onPress={() => setSelectedTab('deferred')}
                      tintColor={project?.color}
                    />
                  </HStack>
                </ScrollView>

                {tabTasks.length === 0 ? (
                  <UIText
                    modifiers={[
                      foregroundStyle(MUTED_GRAY),
                      frame({ maxWidth: Infinity, alignment: 'center' }),
                      padding({ vertical: 40 }),
                    ]}>
                    {emptyLabel}
                  </UIText>
                ) : (
                  tabTasks.map((task) => (
                    <SwipeActions key={task.id}>
                      <TaskRow
                        task={task}
                        progress={getSubtaskProgress(allTasks, task.id)}
                        onToggle={() => handleTaskToggle(task.id)}
                        onOpen={() => handleTaskPress(task)}
                      />
                      <SwipeActions.Actions edge="trailing" allowsFullSwipe={!showTodayAction}>
                        <Button
                          label="Delete"
                          systemImage="trash"
                          role="destructive"
                          onPress={() => handleDeleteTask(task.id)}
                        />
                        {showTodayAction ? (
                          <Button
                            label="Today"
                            systemImage="calendar"
                            onPress={() => handleSetDueToday(task.id)}
                            modifiers={[tint(TODAY_AMBER)]}
                          />
                        ) : null}
                      </SwipeActions.Actions>
                    </SwipeActions>
                  ))
                )}
              </Section>

              {/* Progress summary, pushed to the bottom. */}
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
