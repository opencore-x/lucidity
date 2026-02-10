import * as React from 'react';
import { View, Pressable, LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, runOnJS } from 'react-native-reanimated';
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
import { TaskPickerModal } from './TaskPickerModal';
import { Calendar, CornerLeftUp, Folder, Flag, Activity, RefreshCw, Milestone, ChevronDown } from '@/lib/icons';
import { useMilestones } from '@/hooks/useMilestones';
import type { Task, Project, UpdateTask } from '@lucidity/shared';
import type { Option } from '@rn-primitives/select';

interface TaskOptionsProps {
  task: Task;
  tasks: Task[];
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
  { value: 'blocked', label: 'Blocked' },
  { value: 'deferred', label: 'Deferred' },
];

const PRIORITY_STEPS = [1, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];

function snapToStep(value: number): number {
  let closest = PRIORITY_STEPS[0];
  for (const step of PRIORITY_STEPS) {
    if (Math.abs(step - value) < Math.abs(closest - value)) closest = step;
  }
  return closest;
}

const REPEAT_OPTIONS = [
  { value: '', label: 'Never' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

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

const THUMB_SIZE = 24;
const TRACK_HEIGHT = 6;
const STEP_COUNT = 10; // 0..10 = 11 positions

function PrioritySlider({ value, onValueChange, onLiveChange }: { value: number; onValueChange: (index: number) => void; onLiveChange?: (index: number) => void }) {
  const trackWidth = useSharedValue(0);
  const thumbX = useSharedValue(0);
  const currentIndex = useSharedValue(value);

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    trackWidth.value = w;
    thumbX.value = (value / STEP_COUNT) * w;
  };

  React.useEffect(() => {
    if (trackWidth.value > 0) {
      thumbX.value = withTiming((value / STEP_COUNT) * trackWidth.value, { duration: 150 });
      currentIndex.value = value;
    }
  }, [value]);

  const snapToIndex = (x: number) => {
    'worklet';
    const clamped = Math.max(0, Math.min(x, trackWidth.value));
    const idx = Math.round((clamped / trackWidth.value) * STEP_COUNT);
    currentIndex.value = idx;
    thumbX.value = (idx / STEP_COUNT) * trackWidth.value;
    return idx;
  };

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      const idx = snapToIndex(e.x);
      if (onLiveChange) runOnJS(onLiveChange)(idx);
    })
    .onEnd((e) => {
      const idx = snapToIndex(e.x);
      runOnJS(onValueChange)(idx);
    })
    .hitSlop({ top: 16, bottom: 16 });

  const tap = Gesture.Tap()
    .onEnd((e) => {
      const idx = snapToIndex(e.x);
      runOnJS(onValueChange)(idx);
    })
    .hitSlop({ top: 16, bottom: 16 });

  const gesture = Gesture.Race(pan, tap);

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: thumbX.value - THUMB_SIZE / 2 }],
  }));

  const fillStyle = useAnimatedStyle(() => ({
    width: thumbX.value,
  }));

  return (
    <GestureDetector gesture={gesture}>
      <View style={{ height: 40, justifyContent: 'center' }} onLayout={onLayout}>
        <View style={{ height: TRACK_HEIGHT, borderRadius: TRACK_HEIGHT / 2, backgroundColor: '#3F3F46' }}>
          <Animated.View
            style={[
              { height: TRACK_HEIGHT, borderRadius: TRACK_HEIGHT / 2, backgroundColor: '#A1A1AA' },
              fillStyle,
            ]}
          />
        </View>
        <Animated.View
          style={[
            {
              position: 'absolute',
              width: THUMB_SIZE,
              height: THUMB_SIZE,
              borderRadius: THUMB_SIZE / 2,
              backgroundColor: '#FFFFFF',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 4,
              elevation: 4,
            },
            thumbStyle,
          ]}
        />
      </View>
    </GestureDetector>
  );
}

function getDescendantIds(tasks: Task[], taskId: string): Set<string> {
  const descendants = new Set<string>();
  const queue = [taskId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const t of tasks) {
      if (t.parentTaskId === current && !descendants.has(t.id)) {
        descendants.add(t.id);
        queue.push(t.id);
      }
    }
  }
  return descendants;
}

export function TaskOptions({ task, tasks, project, projects, onUpdate }: TaskOptionsProps) {
  const [parentPickerVisible, setParentPickerVisible] = React.useState(false);
  const { data: milestones } = useMilestones(task.projectId);

  const handleProjectChange = (option: Option) => {
    if (option?.value && option.value !== task.projectId) {
      onUpdate({ projectId: option.value, milestoneId: null });
    }
  };

  const handleMilestoneChange = (option: Option) => {
    const newValue = option?.value || null;
    if (newValue !== task.milestoneId) {
      onUpdate({ milestoneId: newValue });
    }
  };

  const handleParentChange = (newParentId: string | null) => {
    if (newParentId === task.parentTaskId) return;
    const update: Partial<UpdateTask> = { parentTaskId: newParentId };
    if (newParentId) {
      const newParent = tasks.find((t) => t.id === newParentId);
      if (newParent && newParent.projectId !== task.projectId) {
        update.projectId = newParent.projectId;
        update.milestoneId = null;
      }
    }
    onUpdate(update);
  };

  const handleDueDateChange = (date: Date | null) => {
    onUpdate({ dueDate: date });
  };

  const handleStatusChange = (option: Option) => {
    if (option?.value && option.value !== task.status) {
      onUpdate({ status: option.value as Task['status'] });
    }
  };

  const handlePriorityChange = (index: number) => {
    const newPriority = PRIORITY_STEPS[index];
    if (newPriority !== task.priority) {
      onUpdate({ priority: newPriority });
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

  const milestoneOptions = [
    { value: '', label: 'None' },
    ...(milestones?.map((m) => ({ value: m.id, label: m.name })) ?? []),
  ];

  const currentMilestone = milestones?.find((m) => m.id === task.milestoneId);
  const currentMilestoneOption = currentMilestone
    ? { value: currentMilestone.id, label: currentMilestone.name }
    : undefined;

  const descendantIds = React.useMemo(() => getDescendantIds(tasks, task.id), [tasks, task.id]);
  const currentParentTask = tasks.find((t) => t.id === task.parentTaskId);

  const currentStatus = STATUS_OPTIONS.find((s) => s.value === task.status);
  const snappedPriority = snapToStep(task.priority);
  const priorityIndex = PRIORITY_STEPS.indexOf(snappedPriority);
  const [livePriority, setLivePriority] = React.useState<number | null>(null);
  const displayPriority = livePriority !== null ? PRIORITY_STEPS[livePriority] : snappedPriority;
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

      {/* Milestone - only show when task belongs to a project */}
      {task.projectId && (
        <>
          <Separator />

          <OptionRow icon={<Milestone size={iconSize} color={iconColor} />} label="Milestone">
            <Select value={currentMilestoneOption} onValueChange={handleMilestoneChange}>
              <SelectTrigger
                className="border-0 bg-transparent px-0 flex-1"
                style={{ height: ROW_HEIGHT }}
              >
                <SelectValue
                  className="text-base text-muted-foreground native:text-base"
                  placeholder="None"
                />
              </SelectTrigger>
              <SelectContent>
                {milestoneOptions.map((m) => (
                  <SelectItem key={m.value} value={m.value} label={m.label} />
                ))}
              </SelectContent>
            </Select>
          </OptionRow>
        </>
      )}

      <Separator />

      {/* Parent Task */}
      <OptionRow icon={<CornerLeftUp size={iconSize} color={iconColor} />} label="Parent Task">
        <Pressable
          onPress={() => setParentPickerVisible(true)}
          className="flex-row items-center flex-1"
          style={{ height: ROW_HEIGHT }}
        >
          <Text
            className="flex-1 text-base text-muted-foreground"
            numberOfLines={1}
          >
            {currentParentTask?.title ?? 'None'}
          </Text>
          <ChevronDown size={16} color={iconColor} />
        </Pressable>
      </OptionRow>

      <TaskPickerModal
        visible={parentPickerVisible}
        onClose={() => setParentPickerVisible(false)}
        onSelect={handleParentChange}
        tasks={tasks}
        projects={projects}
        currentTaskId={task.id}
        excludeIds={descendantIds}
      />

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
      <View className="flex-row items-center px-4" style={{ minHeight: ROW_HEIGHT }}>
        <View className="w-5 mr-3 items-center">
          <Flag size={iconSize} color={iconColor} />
        </View>
        <Text className="w-28 text-base text-foreground">Priority</Text>
        <View className="flex-1 mr-4">
          <PrioritySlider
            value={priorityIndex}
            onLiveChange={setLivePriority}
            onValueChange={(idx) => { setLivePriority(null); handlePriorityChange(idx); }}
          />
        </View>
        <Text numberOfLines={1} className="text-base text-muted-foreground" style={{ minWidth: 36, textAlign: 'right' }}>{displayPriority}</Text>
      </View>

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
