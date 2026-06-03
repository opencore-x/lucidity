import * as React from 'react';
import { View, ActivityIndicator, Alert, ActionSheetIOS } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import {
  Host,
  ZStack,
  List,
  ScrollView,
  HStack,
  Button,
  SwipeActions,
  Text as UIText,
} from '@expo/ui/swift-ui';
import {
  listStyle,
  refreshable,
  frame,
  foregroundStyle,
  listRowSeparator,
  buttonStyle,
  controlSize,
  padding,
  scrollDismissesKeyboard,
  scrollIndicators,
} from '@expo/ui/swift-ui/modifiers';
import { useColorScheme } from 'nativewind';
import { useQueryClient } from '@tanstack/react-query';
import { UserMenu } from '@/components/user-menu';
import { HeaderGlassButton } from '@/components/native/HeaderGlassButton';
import { MilestoneRow } from '@/components/native/MilestoneRow';
import { TaskComposer } from '@/components/native/TaskComposer';
import { useProjects } from '@/hooks/useProjects';
import { useAllMilestones, useCreateMilestone } from '@/hooks/useMilestones';
import { useUndoableDeleteMilestone } from '@/hooks/useUndoableDeleteMilestone';
import { useMilestoneFilterStore } from '@/stores/milestoneFilterStore';

const MUTED_GRAY = '#8E8E93';

export default function MilestonesScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const scheme = colorScheme === 'dark' ? 'dark' : 'light';

  const {
    data: allProjects = [],
    isLoading: projectsLoading,
    refetch: refetchProjects,
  } = useProjects();
  const {
    data: milestones = [],
    isLoading: milestonesLoading,
    refetch: refetchMilestones,
  } = useAllMilestones();
  const createMilestone = useCreateMilestone();
  const { deleteMilestone } = useUndoableDeleteMilestone();
  const queryClient = useQueryClient();

  const projects = React.useMemo(() => allProjects.filter((p) => !p.isArchived), [allProjects]);
  const isLoading = projectsLoading || milestonesLoading;

  // Persisted across sessions so reopening Milestones restores the last project filter.
  const selectedProjectId = useMilestoneFilterStore((s) => s.selectedProjectId);
  const setSelectedProjectId = useMilestoneFilterStore((s) => s.setSelectedProjectId);
  // The composer for naming a new milestone; pendingProjectId is the project it lands in.
  const [pendingProjectId, setPendingProjectId] = React.useState<string | null>(null);

  const projectsWithMilestones = React.useMemo(() => {
    const projectIds = new Set(milestones.map((m) => m.projectId));
    return projects.filter((p) => projectIds.has(p.id));
  }, [milestones, projects]);

  // Fall back to "All" if the remembered project no longer has a filter pill (deleted or
  // its milestones are gone) — keeps the highlight + filter consistent without clearing
  // the saved choice, so it re-applies if that project regains milestones.
  const effectiveProjectId =
    selectedProjectId && projectsWithMilestones.some((p) => p.id === selectedProjectId)
      ? selectedProjectId
      : null;

  const filteredMilestones = React.useMemo(
    () =>
      effectiveProjectId
        ? milestones.filter((m) => m.projectId === effectiveProjectId)
        : milestones,
    [milestones, effectiveProjectId]
  );

  const onRefresh = React.useCallback(async () => {
    queryClient.invalidateQueries({ queryKey: ['milestoneProgress'] });
    await Promise.all([refetchProjects(), refetchMilestones()]);
  }, [refetchProjects, refetchMilestones, queryClient]);

  // + → choose the target project (skip the picker when a filter is active or there's
  // only one), then open the composer to name the milestone.
  const handleCreateMilestone = React.useCallback(() => {
    if (projects.length === 0) {
      Alert.alert('No Projects', 'Create a project first to add milestones.');
      return;
    }
    if (effectiveProjectId) {
      setPendingProjectId(effectiveProjectId);
      return;
    }
    if (projects.length === 1) {
      setPendingProjectId(projects[0].id);
      return;
    }
    const options = [...projects.map((p) => p.name), 'Cancel'];
    ActionSheetIOS.showActionSheetWithOptions(
      { options, cancelButtonIndex: options.length - 1, title: 'Select a project' },
      (index) => {
        if (index < projects.length) setPendingProjectId(projects[index].id);
      }
    );
  }, [projects, effectiveProjectId]);

  const handleSubmitMilestone = React.useCallback(
    (name: string) => {
      if (pendingProjectId) createMilestone.mutate({ projectId: pendingProjectId, name });
    },
    [createMilestone, pendingProjectId]
  );

  const headerRight = React.useCallback(
    () => (
      <View className="flex-row items-center gap-2">
        <HeaderGlassButton systemImage="plus" onPress={handleCreateMilestone} />
        <UserMenu />
      </View>
    ),
    [handleCreateMilestone]
  );

  const filterButton = (id: string | null, label: string) => (
    <Button
      key={id ?? 'all'}
      label={label}
      onPress={() => setSelectedProjectId(id)}
      modifiers={[
        controlSize('small'),
        buttonStyle(effectiveProjectId === id ? 'glassProminent' : 'glass'),
      ]}
    />
  );

  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Milestones', headerRight }} />
        <View className="bg-background flex-1 items-center justify-center">
          <ActivityIndicator size="large" />
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Milestones', headerRight }} />
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
              {projectsWithMilestones.length > 1 ? (
                <ScrollView
                  axes="horizontal"
                  modifiers={[listRowSeparator('hidden'), scrollIndicators('hidden')]}>
                  <HStack spacing={8}>
                    {filterButton(null, 'All')}
                    {projectsWithMilestones.map((p) => filterButton(p.id, p.name))}
                  </HStack>
                </ScrollView>
              ) : null}

              {filteredMilestones.length === 0 ? (
                <UIText
                  modifiers={[
                    foregroundStyle(MUTED_GRAY),
                    frame({ maxWidth: Infinity, alignment: 'center' }),
                    padding({ vertical: 48 }),
                  ]}>
                  No milestones yet
                </UIText>
              ) : (
                filteredMilestones.map((milestone) => (
                  <SwipeActions key={milestone.id}>
                    <MilestoneRow
                      milestone={milestone}
                      projectName={projects.find((p) => p.id === milestone.projectId)?.name}
                      onOpen={() => router.push(`/milestone/${milestone.id}`)}
                    />
                    <SwipeActions.Actions edge="trailing">
                      <Button
                        label="Delete"
                        systemImage="trash"
                        role="destructive"
                        onPress={() => deleteMilestone(milestone.id)}
                      />
                    </SwipeActions.Actions>
                  </SwipeActions>
                ))
              )}
            </List>

            {pendingProjectId ? (
              <TaskComposer
                placeholder="Milestone name…"
                onSubmit={handleSubmitMilestone}
                onClose={() => setPendingProjectId(null)}
              />
            ) : null}
          </ZStack>
        </Host>
      </View>
    </>
  );
}
