import * as React from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import * as SelectPrimitive from '@rn-primitives/select';
import { SelectContent, SelectItem } from '@/components/ui/select';
import type { Task } from '@lucidity/shared';
import type { Option } from '@rn-primitives/select';

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'deferred', label: 'Deferred' },
];

const STATUS_COLORS: Record<string, string> = {
  pending: '#9CA3AF',
  in_progress: '#3B82F6',
  completed: '#22C55E',
  blocked: '#EF4444',
  deferred: '#F59E0B',
};

interface StatusPillProps {
  status: Task['status'];
  onStatusChange: (status: Task['status']) => void;
}

export function StatusPill({ status, onStatusChange }: StatusPillProps) {
  const currentOption = STATUS_OPTIONS.find((s) => s.value === status);
  const dotColor = STATUS_COLORS[status] ?? '#9CA3AF';

  const handleChange = (option: Option) => {
    if (option?.value && option.value !== status) {
      onStatusChange(option.value as Task['status']);
    }
  };

  return (
    <SelectPrimitive.Root value={currentOption} onValueChange={handleChange}>
      <SelectPrimitive.Trigger
        className="self-center flex-row items-center rounded-full border border-border bg-transparent px-3"
        style={{ height: 28, gap: 6 }}
      >
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: dotColor }} />
        <Text className="text-xs text-muted-foreground">{currentOption?.label ?? 'Pending'}</Text>
      </SelectPrimitive.Trigger>
      <SelectContent>
        {STATUS_OPTIONS.map((s) => (
          <SelectItem key={s.value} value={s.value} label={s.label} />
        ))}
      </SelectContent>
    </SelectPrimitive.Root>
  );
}
