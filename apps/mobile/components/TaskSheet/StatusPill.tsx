import * as React from 'react';
import { Menu, HStack, Image, Text, Button } from '@expo/ui/swift-ui';
import { glassEffect, padding, foregroundStyle } from '@expo/ui/swift-ui/modifiers';
import type { Task } from '@lucidity/shared';

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

/**
 * Native @expo/ui status selector: a Liquid Glass capsule (label = a glass-effect
 * HStack with a status-colored dot + text) that opens a native menu of statuses.
 * Returns a bare Menu (no Host) so it composes inside GlobalTaskSheet's SwiftUI
 * tree. The selected status carries a checkmark.
 */
export function StatusPill({ status, onStatusChange }: StatusPillProps) {
  const currentOption = STATUS_OPTIONS.find((s) => s.value === status);
  const dotColor = STATUS_COLORS[status] ?? '#9CA3AF';

  return (
    <Menu
      label={
        <HStack
          spacing={6}
          modifiers={[
            padding({ horizontal: 14, vertical: 7 }),
            glassEffect({
              glass: { variant: 'regular', interactive: true },
              shape: 'capsule',
            }),
          ]}>
          <Image systemName="circle.fill" size={5} color={dotColor} />
          <Text modifiers={[foregroundStyle(dotColor)]}>{currentOption?.label ?? 'Pending'}</Text>
        </HStack>
      }>
      {STATUS_OPTIONS.map((s) => (
        <Button
          key={s.value}
          label={s.label}
          systemImage={s.value === status ? 'checkmark' : undefined}
          onPress={() => {
            if (s.value !== status) {
              onStatusChange(s.value as Task['status']);
            }
          }}
        />
      ))}
    </Menu>
  );
}
