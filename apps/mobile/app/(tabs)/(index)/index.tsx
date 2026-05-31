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
} from '@expo/ui/swift-ui/modifiers';
import { useColorScheme } from 'nativewind';
import { useTasks } from '@/hooks/useTasks';
import { useProjects, useCreateProject } from '@/hooks/useProjects';
import { groupTasksByProject } from '@/utils/helpers';

// Secondary gray for the trailing count + the Inbox/no-color dot (systemGray).
const MUTED_GRAY = '#8E8E93';

/**
 * Projects landing — PHASE 0 SPIKE.
 *
 * Replaces the old accordion (ProjectGroup) stack with a native @expo/ui `List`
 * of tappable project rows (color dot + name + completed/total). Tapping a row
 * opens the project detail screen. This spike exists to verify the one real
 * unknown: a full-screen native List living under the RN large-title nav header
 * (transparent header, dark/light, scroll behaviour). Delete/refresh/Inbox-view
 * land in later phases.
 */
export default function ProjectsScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const scheme = colorScheme === 'dark' ? 'dark' : 'light';

  const { data: tasks = [], isLoading: tasksLoading } = useTasks();
  const { data: allProjects = [], isLoading: projectsLoading } = useProjects();
  const createProject = useCreateProject();

  const projects = React.useMemo(() => allProjects.filter((p) => !p.isArchived), [allProjects]);
  const isLoading = tasksLoading || projectsLoading;

  // Inbox first, then projects (groupTasksByProject sorts + buckets root tasks).
  // Count mirrors the old header: root tasks only (no subtasks).
  const rows = React.useMemo(() => {
    const grouped = groupTasksByProject(tasks, projects);
    return Array.from(grouped.entries()).map(([project, projectTasks]) => ({
      project,
      total: projectTasks.length,
      completed: projectTasks.filter((t) => t.status === 'completed').length,
    }));
  }, [tasks, projects]);

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
          <List modifiers={[listStyle('insetGrouped')]}>
            {rows.map(({ project, total, completed }) => (
              <HStack
                key={project.id}
                spacing={12}
                modifiers={[
                  contentShape(shapes.rectangle()),
                  onTapGesture(() => router.push(`/project/${project.id}`)),
                ]}>
                {/* Gray dot for Inbox + any colorless project; project color otherwise. */}
                <Image systemName="circle.fill" size={12} color={project.color ?? MUTED_GRAY} />
                <Text>{project.name}</Text>
                <Spacer />
                <Text modifiers={[foregroundStyle(MUTED_GRAY)]}>{`${completed}/${total}`}</Text>
              </HStack>
            ))}
          </List>
        </Host>
      </View>
    </>
  );
}
