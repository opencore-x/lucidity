import * as React from 'react';
import { View, Pressable } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Plus } from '@/lib/icons';
import { TaskItem } from './TaskItem';
import { getSubtaskProgress } from '@/utils/helpers';
import type { Task, Project } from '@lucidity/shared';

interface ProjectGroupProps {
  project: Project;
  tasks: Task[];
  allTasks: Task[];
  onAddTask: (projectId: string) => void;
  onProjectPress: (project: Project) => void;
  onTaskPress: (task: Task) => void;
  onTaskToggle: (taskId: string) => void;
}

export function ProjectGroup({
  project,
  tasks,
  allTasks,
  onAddTask,
  onProjectPress,
  onTaskPress,
  onTaskToggle,
}: ProjectGroupProps) {
  return (
    <View className="mb-4">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-2 bg-background">
        <Pressable
          className="flex-row items-center flex-1"
          onPress={() => onProjectPress(project)}
        >
          <Text className="text-lg font-semibold">{project.name}</Text>
          <Text className="ml-2 text-sm text-muted-foreground">
            {tasks.length}
          </Text>
        </Pressable>
        <Button
          variant="ghost"
          size="icon"
          onPress={() => onAddTask(project.id)}
        >
          <Plus size={20} color="#3B82F6" />
        </Button>
      </View>

      {/* Tasks */}
      {tasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          onPress={() => onTaskPress(task)}
          onToggle={() => onTaskToggle(task.id)}
          subtaskProgress={getSubtaskProgress(allTasks, task.id)}
        />
      ))}
    </View>
  );
}
