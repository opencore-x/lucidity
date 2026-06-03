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
  listRowBackground,
  refreshable,
  frame,
  foregroundStyle,
  font,
  scrollDismissesKeyboard,
  scrollIndicators,
  textFieldStyle,
  lineLimit,
  truncationMode,
  listSectionSpacing,
} from '@expo/ui/swift-ui/modifiers';
import { useColorScheme } from 'nativewind';
import { useQueryClient } from '@tanstack/react-query';
import { Text } from '@/components/ui/text';
import { UserMenu } from '@/components/user-menu';
import { HeaderGlassButton } from '@/components/native/HeaderGlassButton';
import { TaskRow } from '@/components/native/TaskRow';
import { TaskComposer } from '@/components/native/TaskComposer';
import { EditableField } from '@/components/native/EditableField';
import { PillButton } from '@/components/native/PillButton';
import { SegmentTab } from '@/components/native/SegmentTab';
import { LARGE_TITLE_SCREEN_OPTIONS } from '@/lib/headerConfig';
import { useProjects } from '@/hooks/useProjects';
import { useAllMilestones, useMilestoneProgress, useUpdateMilestone } from '@/hooks/useMilestones';
import { useTasks, useCreateTask, useToggleTask, useUpdateTask } from '@/hooks/useTasks';
import { useUndoableDeleteTask } from '@/hooks/useUndoableDeleteTask';
import { useSheetStore } from '@/stores/sheetStore';
import { getSubtaskProgress } from '@/utils/helpers';
import type { Task } from '@lucidity/shared';

const MUTED_GRAY = '#8E8E93';
const TODAY_AMBER = '#F59E0B';
const PROGRESS_BLUE = '#3B82F6';
const DONE_GREEN = '#22C55E';

// Milestone names are long ("M1: Core Platform + Visitor Management") and don't fit the
// nav bar OR the large-title area without truncating. So the nav title is the generic
// "Milestone" (signals the screen type), and the milestone name lives as a wrapping
// title in the content.
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
  const updateMilestone = useUpdateMilestone();
  const { deleteTask } = useUndoableDeleteTask();
  const { openSheet } = useSheetStore();
  const queryClient = useQueryClient();

  const [selectedTab, setSelectedTab] = React.useState<'active' | 'deferred' | 'completed'>(
    'active'
  );
  const [composing, setComposing] = React.useState(false);

  // Description has three modes: a collapsed 3-line preview (tap to read), an expanded
  // read-only full view (no keyboard; tap to re-collapse, with an explicit Edit button),
  // and an editing field. Reading and editing are deliberately separate so a tap to read
  // doesn't pop the keyboard. While editing, the nav bar shows a "Done" button that blurs
  // the field (its save affordance, since a multiline field can't submit on Enter);
  // blurDescRef holds that blur fn.
  const [descMode, setDescMode] = React.useState<'collapsed' | 'expanded' | 'editing'>(
    'collapsed'
  );
  const blurDescRef = React.useRef<(() => void) | null>(null);
  const handleDescFocus = React.useCallback((blur: () => void) => {
    blurDescRef.current = blur;
    setDescMode('editing');
  }, []);
  const handleDescBlur = React.useCallback(() => setDescMode('expanded'), []);

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
          // Always "Milestone" — the milestone's own name is the in-content heading, so a
          // generic nav title is what signals which kind of screen you're on.
          title: 'Milestone',
          headerTintColor: project?.color ?? undefined,
          headerRight: () =>
            descMode === 'editing' ? (
              <Host matchContents colorScheme={scheme}>
                <Button
                  label="Done"
                  onPress={() => blurDescRef.current?.()}
                  modifiers={project?.color ? [tint(project.color)] : []}
                />
              </Host>
            ) : (
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
              {/* Milestone name as a plain wrapping heading (no grouped card) — long names
                  don't fit the nav bar, which shows the short project name. The clear row
                  background drops the inset-grouped card without clipping the title. */}
              <Section modifiers={[listSectionSpacing('compact')]}>
                <VStack
                  spacing={4}
                  alignment="leading"
                  modifiers={[listRowBackground('#00000000'), listRowSeparator('hidden')]}>
                  <UIText modifiers={[font({ size: 22, weight: 'semibold' })]}>
                    {milestone.name}
                  </UIText>
                  {due ? (
                    <UIText modifiers={[foregroundStyle(MUTED_GRAY), font({ size: 13 })]}>
                      {`Due ${due}`}
                    </UIText>
                  ) : null}
                  {/* Milestone description. Reading + editing are driven by explicit glass
                      pills (no keyboard on read):
                      - collapsed: muted 3-line preview + a "Read more" pill
                      - expanded: full text + "Read less" and "Edit" pills
                      - editing: auto-focused field, saved via nav-bar "Done"
                      Empty: a single "Add description" pill. */}
                  {descMode === 'editing' ? (
                    <EditableField
                      key={`mdesc-${milestone.id}`}
                      value={milestone.description ?? ''}
                      onCommit={(t) =>
                        updateMilestone.mutate({
                          id: milestone.id,
                          data: { description: t || null },
                        })
                      }
                      allowEmpty
                      multiline
                      autoFocus
                      placeholder="Description…"
                      onFocusEnter={handleDescFocus}
                      onFocusLeave={handleDescBlur}
                      modifiers={[textFieldStyle('plain'), font({ size: 17 }), padding({ top: 6 })]}
                    />
                  ) : milestone.description ? (
                    <VStack
                      alignment="leading"
                      spacing={8}
                      modifiers={[
                        frame({ maxWidth: Infinity, alignment: 'leading' }),
                        padding({ top: 6 }),
                      ]}>
                      <UIText
                        modifiers={[
                          foregroundStyle(MUTED_GRAY),
                          font({ size: 15 }),
                          frame({ maxWidth: Infinity, alignment: 'leading' }),
                          ...(descMode === 'collapsed'
                            ? [lineLimit(3), truncationMode('tail')]
                            : []),
                        ]}>
                        {milestone.description}
                      </UIText>
                      <HStack spacing={8}>
                        {descMode === 'collapsed' ? (
                          <PillButton label="Read more" onPress={() => setDescMode('expanded')} />
                        ) : (
                          <>
                            <PillButton
                              label="Read less"
                              onPress={() => setDescMode('collapsed')}
                            />
                            <PillButton label="Edit" onPress={() => setDescMode('editing')} />
                          </>
                        )}
                      </HStack>
                    </VStack>
                  ) : (
                    <HStack spacing={8} modifiers={[padding({ top: 6 })]}>
                      <PillButton label="Add description" onPress={() => setDescMode('editing')} />
                    </HStack>
                  )}
                </VStack>
              </Section>

              {/* Tabs + the task list. */}
              <Section>
                <ScrollView
                  axes="horizontal"
                  modifiers={[listRowSeparator('hidden'), scrollIndicators('hidden')]}>
                  {/* Inner padding gives the glass tabs room to "lift" on press without the
                      ScrollView clipping the expanded edges (top/bottom + first/last). */}
                  <HStack spacing={8} modifiers={[padding({ vertical: 8, horizontal: 4 })]}>
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
