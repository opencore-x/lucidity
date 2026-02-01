import * as React from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { Calendar, Folder, Flag, Activity, RefreshCw } from '@/lib/icons';
import type { Task, Project, UpdateTask } from '@lucidity/shared';
import type { Option } from '@rn-primitives/select';

interface TaskOptionsProps {
  task: Task;
  project: Project | undefined;
  projects: Project[];
  onUpdate: (data: Partial<UpdateTask>) => void;
}

const iconColor = '#6B7280';
const iconSize = 20;

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
];

const PRIORITY_OPTIONS = [
  { value: '1', label: 'Lowest' },
  { value: '250', label: 'Low' },
  { value: '500', label: 'Normal' },
  { value: '750', label: 'High' },
  { value: '1000', label: 'Highest' },
];

const REPEAT_OPTIONS = [
  { value: '', label: 'Never' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

function getPriorityValue(priority: number): string {
  if (priority <= 125) return '1';
  if (priority <= 375) return '250';
  if (priority <= 625) return '500';
  if (priority <= 875) return '750';
  return '1000';
}

interface OptionRowProps {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}

const ROW_HEIGHT = 48;

function OptionRow({ icon, label, children }: OptionRowProps) {
  return (
    <View className="flex-row items-center px-4" style={{ minHeight: ROW_HEIGHT }}>
      <View className="w-5 mr-3 items-center">{icon}</View>
      <Text className="w-28 text-base text-foreground">{label}</Text>
      <View className="flex-1 justify-center" style={{ minHeight: ROW_HEIGHT }}>
        {children}
      </View>
    </View>
  );
}

export function TaskOptions({ task, project, projects, onUpdate }: TaskOptionsProps) {
  const handleProjectChange = (option: Option) => {
    if (option?.value && option.value !== task.projectId) {
      onUpdate({ projectId: option.value });
    }
  };

  const handleDueDateChange = (date: Date | null) => {
    onUpdate({ dueDate: date });
  };

  const handleStatusChange = (option: Option) => {
    if (option?.value && option.value !== task.status) {
      onUpdate({ status: option.value as 'pending' | 'in_progress' | 'completed' });
    }
  };

  const handlePriorityChange = (option: Option) => {
    if (option?.value) {
      const newPriority = parseInt(option.value, 10);
      if (newPriority !== task.priority) {
        onUpdate({ priority: newPriority });
      }
    }
  };

  const handleRepeatChange = (option: Option) => {
    const newValue = option?.value || null;
    if (newValue !== task.recurringFrequency) {
      onUpdate({ recurringFrequency: newValue as 'daily' | 'weekly' | 'monthly' | 'yearly' | null });
    }
  };

  const projectOptions = projects.map((p) => ({
    value: p.id,
    label: p.name,
  }));

  const currentProject = project
    ? { value: project.id, label: project.name }
    : undefined;

  const currentStatus = STATUS_OPTIONS.find((s) => s.value === task.status);
  const currentPriorityValue = getPriorityValue(task.priority);
  const currentPriority = PRIORITY_OPTIONS.find((p) => p.value === currentPriorityValue);
  const currentRepeat = REPEAT_OPTIONS.find((r) => r.value === (task.recurringFrequency ?? ''));

  return (
    <View className="mt-4">
      <Separator />

      {/* Project */}
      <OptionRow icon={<Folder size={iconSize} color={iconColor} />} label="Project">
        <Select value={currentProject} onValueChange={handleProjectChange}>
          <SelectTrigger
            className="border-0 bg-transparent px-0 flex-1"
            style={{ height: ROW_HEIGHT }}
          >
            <SelectValue
              className="text-base text-muted-foreground native:text-base"
              placeholder="Select project"
            />
          </SelectTrigger>
          <SelectContent>
            {projectOptions.map((p) => (
              <SelectItem key={p.value} value={p.value} label={p.label} />
            ))}
          </SelectContent>
        </Select>
      </OptionRow>

      <Separator />

      {/* Status */}
      <OptionRow icon={<Activity size={iconSize} color={iconColor} />} label="Status">
        <Select value={currentStatus} onValueChange={handleStatusChange}>
          <SelectTrigger
            className="border-0 bg-transparent px-0 flex-1"
            style={{ height: ROW_HEIGHT }}
          >
            <SelectValue
              className="text-base text-muted-foreground native:text-base"
              placeholder="Select status"
            />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s.value} value={s.value} label={s.label} />
            ))}
          </SelectContent>
        </Select>
      </OptionRow>

      <Separator />

      {/* Priority */}
      <OptionRow icon={<Flag size={iconSize} color={iconColor} />} label="Priority">
        <Select value={currentPriority} onValueChange={handlePriorityChange}>
          <SelectTrigger
            className="border-0 bg-transparent px-0 flex-1"
            style={{ height: ROW_HEIGHT }}
          >
            <SelectValue
              className="text-base text-muted-foreground native:text-base"
              placeholder="Select priority"
            />
          </SelectTrigger>
          <SelectContent>
            {PRIORITY_OPTIONS.map((p) => (
              <SelectItem key={p.value} value={p.value} label={p.label} />
            ))}
          </SelectContent>
        </Select>
      </OptionRow>

      <Separator />

      {/* Due Date */}
      <OptionRow icon={<Calendar size={iconSize} color={iconColor} />} label="Due Date">
        <DatePicker
          value={task.dueDate ? new Date(task.dueDate) : undefined}
          onChange={handleDueDateChange}
          placeholder="None"
          className="flex-1"
          height={ROW_HEIGHT}
        />
      </OptionRow>

      {/* Repeat - only show if due date is set */}
      {task.dueDate && (
        <>
          <Separator />

          <OptionRow icon={<RefreshCw size={iconSize} color={iconColor} />} label="Repeat">
            <Select value={currentRepeat} onValueChange={handleRepeatChange}>
              <SelectTrigger
                className="border-0 bg-transparent px-0 flex-1"
                style={{ height: ROW_HEIGHT }}
              >
                <SelectValue
                  className="text-base text-muted-foreground native:text-base"
                  placeholder="Never"
                />
              </SelectTrigger>
              <SelectContent>
                {REPEAT_OPTIONS.map((r) => (
                  <SelectItem key={r.value} value={r.value} label={r.label} />
                ))}
              </SelectContent>
            </Select>
          </OptionRow>

          <Separator />
        </>
      )}
    </View>
  );
}
