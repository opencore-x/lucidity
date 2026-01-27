import * as React from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import { Separator } from '@/components/ui/separator';
import { Calendar, Clock, Folder, Flag, Activity } from '@/lib/icons';
import { formatDate, formatStatus } from '@/utils/helpers';
import { getPriorityLabel } from '@/utils/constants';
import type { Task, Project } from '@opentask/shared';

interface TaskOptionsProps {
  task: Task;
  project: Project | undefined;
}

interface OptionRowProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

function OptionRow({ icon, label, value }: OptionRowProps) {
  return (
    <View className="flex-row items-center py-3 px-4">
      <View className="mr-3">{icon}</View>
      <Text className="flex-1 text-base text-foreground">{label}</Text>
      <Text className="text-base text-muted-foreground">{value}</Text>
    </View>
  );
}

export function TaskOptions({ task, project }: TaskOptionsProps) {
  const iconColor = '#6B7280';
  const iconSize = 20;

  return (
    <View className="mt-4">
      <Separator />

      <OptionRow
        icon={<Folder size={iconSize} color={iconColor} />}
        label="Project"
        value={project?.name || 'Unknown'}
      />

      <Separator />

      <OptionRow
        icon={<Calendar size={iconSize} color={iconColor} />}
        label="Due Date"
        value={formatDate(task.dueDate)}
      />

      <Separator />

      <OptionRow
        icon={<Activity size={iconSize} color={iconColor} />}
        label="Status"
        value={formatStatus(task.status)}
      />

      <Separator />

      <OptionRow
        icon={<Flag size={iconSize} color={iconColor} />}
        label="Priority"
        value={getPriorityLabel(task.priority)}
      />

      <Separator />
    </View>
  );
}
