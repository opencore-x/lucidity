import * as React from 'react';
import { View, ActivityIndicator, useWindowDimensions } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import {
  Host,
  ZStack,
  VStack,
  HStack,
  ScrollView,
  Button,
  Image,
  List,
  Section,
  SwipeActions,
  ProgressView,
  Text as UIText,
} from '@expo/ui/swift-ui';
import {
  tint,
  buttonStyle,
  glassEffect,
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
import { useColorScheme } from '@/hooks/useColorScheme';
import { layout } from '@/lib/layout';
import { COLORS } from '@/lib/theme';
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
const ICON_BLUE = '#0A84FF'; // iOS system blue — matches GlobalTaskSheet's save tick
const TODAY_AMBER = '#F59E0B';
const PROGRESS_BLUE = '#3B82F6';
const DONE_GREEN = '#22C55E';

// The collapsed description preview clamps to this many lines.
const DESC_PREVIEW_LINES = 2;
const DESC_FONT_SIZE = 15;

// SwiftUI Text exposes no truncation callback, so we estimate whether a description
// overflows the preview — to choose between a "Read more" toggle and showing "Edit"
// directly. Approximate (proportional font), but a wrong guess is harmless: Edit always
// reveals the full text. Tune the 0.55 glyph-width factor if the cutoff feels off.
function descriptionOverflowsPreview(text: string, contentWidth: number): boolean {
  const charsPerLine = Math.floor(contentWidth / (DESC_FONT_SIZE * 0.55));
  if (charsPerLine <= 0) return false;
  const rows = text
    .split('\n')
    .reduce((acc, line) => acc + Math.max(1, Math.ceil(line.length / charsPerLine)), 0);
  return rows > DESC_PREVIEW_LINES;
}

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

  // Description has three modes: a collapsed 2-line preview (tap to read), an expanded
  // read-only full view (no keyboard; tap to re-collapse, with an explicit Edit button),
  // and an editing field. Reading and editing are deliberately separate so a tap to read
  // doesn't pop the keyboard. While editing, the nav bar shows a "Done" button that blurs
  // the field (its save affordance, since a multiline field can't submit on Enter);
  // blurDescRef holds that blur fn.
  const [descMode, setDescMode] = React.useState<'collapsed' | 'expanded' | 'editing'>('collapsed');
  const blurDescRef = React.useRef<(() => void) | null>(null);
  const handleDescFocus = React.useCallback((blur: () => void) => {
    blurDescRef.current = blur;
    setDescMode('editing');
  }, []);
  const handleDescBlur = React.useCallback(() => setDescMode('expanded'), []);

  // Whether the description is long enough to need the "Read more" toggle. Short ones
  // skip it and show "Edit" directly. insetGrouped content width ≈ window minus the
  // grouped section margins + row insets (~64pt total).
  const { width: windowWidth } = useWindowDimensions();
  const descOverflows = milestone?.description
    ? descriptionOverflowsPreview(milestone.description, windowWidth - 64)
    : false;

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
        <View style={[layout.center, { backgroundColor: COLORS[scheme].background }]}>
          <ActivityIndicator size="large" />
        </View>
      </>
    );
  }

  if (!milestone) {
    return (
      <>
        <Stack.Screen options={{ ...MILESTONE_HEADER, title: 'Not Found' }} />
        <View style={[layout.center, { backgroundColor: COLORS[scheme].background }]}>
          <Text style={{ color: COLORS[scheme].mutedForeground }}>Milestone not found</Text>
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
                {/* KNOWN ISSUE (tracked on Lucidity task #203 — left open): this is the
                    SAME blue interactive-glass save tick as GlobalTaskSheet's circleBlue
                    (identical modifiers), but rendered as a nav-bar headerRight item it
                    shows a faint "button in button" glass edge — the tinted circle doesn't
                    read edge-to-edge the way it does inside the sheet. The difference is the
                    surface, not the button: the nav bar appears to wrap the bar item in its
                    own (clear) glass, so a tinted glass nested inside reveals an outer ring.
                    Already fixed: vertical clipping (36pt) and the project-color press
                    (tint override below). The residual double-glass is unresolved — next
                    things to try: a borderless/non-glass icon here, or move the "Done"
                    affordance off the nav bar so it can be a plain sheet-style glass button.
                    Do NOT try to fix this by chasing padding/insets — it's the bar item. */}
                <Button
                  onPress={() => blurDescRef.current?.()}
                  modifiers={[
                    buttonStyle('plain'),
                    // 36pt (not 40) so the circle isn't clipped by the nav bar's ~44pt
                    // content height — same size as HeaderGlassButton, which renders
                    // cleanly in this same bar.
                    frame({ width: 36, height: 36 }),
                    // The screen sets headerTintColor to the project color, which would
                    // tint the bar item's press; force the local accent back to blue so
                    // the interactive glass presses blue, not the project color.
                    tint(ICON_BLUE),
                    glassEffect({
                      glass: { variant: 'regular', interactive: true, tint: ICON_BLUE },
                      shape: 'circle',
                    }),
                  ]}>
                  <Image systemName="checkmark" size={17} color="#FFFFFF" />
                </Button>
              </Host>
            ) : (
              <View style={layout.row}>
                <HeaderGlassButton systemImage="plus" onPress={handleCreateTask} />
                <UserMenu />
              </View>
            ),
        }}
      />
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
              {/* Milestone name as a plain wrapping heading (no grouped card) — long names
                  don't fit the nav bar, which shows the short project name. The clear row
                  background drops the inset-grouped card without clipping the title. */}
              <Section modifiers={[listSectionSpacing(6)]}>
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
                      - short (fits the preview): full text + an "Edit" pill (no "Read more")
                      - long collapsed: muted 2-line preview + a "Read more" pill
                      - long expanded: full text + "Read less" and "Edit" pills
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
                          font({ size: DESC_FONT_SIZE }),
                          frame({ maxWidth: Infinity, alignment: 'leading' }),
                          ...(descOverflows && descMode === 'collapsed'
                            ? [lineLimit(DESC_PREVIEW_LINES), truncationMode('tail')]
                            : []),
                        ]}>
                        {milestone.description}
                      </UIText>
                      <HStack spacing={8}>
                        {!descOverflows ? (
                          // Fits the preview — no "Read more"; edit directly.
                          <PillButton label="Edit" onPress={() => setDescMode('editing')} />
                        ) : descMode === 'collapsed' ? (
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
