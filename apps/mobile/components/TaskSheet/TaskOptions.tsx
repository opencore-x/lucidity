import * as React from 'react';
import { View, Pressable, TextInput, Keyboard } from 'react-native';
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
import { Calendar, Folder, Flag, Activity, Type, FileText } from '@/lib/icons';
import type { Task, Project, UpdateTask } from '@lucidity/shared';
import type { Option } from '@rn-primitives/select';

interface TaskOptionsProps {
  task: Task;
  project: Project | undefined;
  projects: Project[];
  onUpdate: (data: Partial<UpdateTask>) => void;
  onDescriptionChange?: (value: string | null) => void;
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

export function TaskOptions({ task, project, projects, onUpdate, onDescriptionChange }: TaskOptionsProps) {
  const [isEditingTitle, setIsEditingTitle] = React.useState(false);
  const [isEditingDescription, setIsEditingDescription] = React.useState(false);
  const [titleValue, setTitleValue] = React.useState(task.title);
  const [descriptionValue, setDescriptionValue] = React.useState(task.description || '');

  React.useEffect(() => {
    setTitleValue(task.title);
    setDescriptionValue(task.description || '');
  }, [task.id, task.title, task.description]);

  const handleTitleSubmit = () => {
    if (titleValue.trim() && titleValue !== task.title) {
      onUpdate({ title: titleValue.trim() });
    } else {
      setTitleValue(task.title);
    }
    setIsEditingTitle(false);
    Keyboard.dismiss();
  };

  const handleDescriptionSubmit = () => {
    const newDescription = descriptionValue.trim() || undefined;
    if (newDescription !== (task.description || undefined)) {
      onUpdate({ description: newDescription });
    }
    setIsEditingDescription(false);
    onDescriptionChange?.(null);
    Keyboard.dismiss();
  };

  const handleProjectChange = (option: Option) => {
    if (option?.value && option.value !== task.projectId) {
      onUpdate({ projectId: option.value });
    }
  };

  const handleDueDateChange = (date: Date | undefined) => {
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

  return (
    <View className="mt-4">
      <Separator />

      {/* Title */}
      <OptionRow icon={<Type size={iconSize} color={iconColor} />} label="Title">
        {isEditingTitle ? (
          <TextInput
            className="flex-1 text-base text-foreground"
            style={{ height: ROW_HEIGHT, padding: 0, margin: 0 }}
            value={titleValue}
            onChangeText={setTitleValue}
            onBlur={handleTitleSubmit}
            onSubmitEditing={handleTitleSubmit}
            autoFocus
            returnKeyType="done"
            blurOnSubmit
          />
        ) : (
          <Pressable
            onPress={() => setIsEditingTitle(true)}
            className="flex-1 flex-row items-center"
            style={{ height: ROW_HEIGHT }}
          >
            <Text className="text-base text-muted-foreground" numberOfLines={1}>
              {task.title}
            </Text>
          </Pressable>
        )}
      </OptionRow>

      <Separator />

      {/* Description */}
      <OptionRow icon={<FileText size={iconSize} color={iconColor} />} label="Description">
        {isEditingDescription ? (
          <TextInput
            className="flex-1 text-base text-foreground"
            style={{ height: ROW_HEIGHT, padding: 0, margin: 0 }}
            value={descriptionValue}
            onChangeText={(text) => {
              setDescriptionValue(text);
              onDescriptionChange?.(text);
            }}
            onBlur={handleDescriptionSubmit}
            onSubmitEditing={handleDescriptionSubmit}
            autoFocus
            returnKeyType="done"
            blurOnSubmit
            placeholder="Add description..."
            placeholderTextColor="#9CA3AF"
          />
        ) : (
          <Pressable
            onPress={() => setIsEditingDescription(true)}
            className="flex-1 flex-row items-center"
            style={{ height: ROW_HEIGHT }}
          >
            <Text
              className={`text-base ${task.description ? 'text-muted-foreground' : 'text-muted-foreground/50'}`}
              numberOfLines={1}
            >
              {task.description || 'Add description...'}
            </Text>
          </Pressable>
        )}
      </OptionRow>

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
    </View>
  );
}
