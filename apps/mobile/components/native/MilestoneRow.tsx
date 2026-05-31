import * as React from 'react';
import { HStack, VStack, Image, Text, ProgressView } from '@expo/ui/swift-ui';
import {
  contentShape,
  shapes,
  onTapGesture,
  foregroundStyle,
  font,
  frame,
  tint,
  lineLimit,
} from '@expo/ui/swift-ui/modifiers';
import { useMilestoneProgress } from '@/hooks/useMilestones';
import type { Milestone } from '@lucidity/shared';

const MUTED_GRAY = '#8E8E93';
const PROGRESS_BLUE = '#3B82F6';
const DONE_GREEN = '#22C55E';

/**
 * A native @expo/ui milestone row for the Milestones landing: the milestone name, a
 * `project · Due date` subtitle, and a progress line (count + native `ProgressView`
 * bar + percent). The whole row is tappable to open the milestone detail screen; a
 * trailing chevron marks it as navigable. Swipe actions are attached by the parent.
 */
export function MilestoneRow({
  milestone,
  projectName,
  onOpen,
}: {
  milestone: Milestone;
  projectName?: string;
  onOpen: () => void;
}) {
  const { data: progress } = useMilestoneProgress(milestone.id);
  const percent = progress?.percent ?? 0;
  const completed = progress?.completed ?? 0;
  const total = progress?.total ?? 0;

  const due = milestone.dueDate
    ? new Date(milestone.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null;
  const subtitle = [projectName, due ? `Due ${due}` : null].filter(Boolean).join(' · ');

  return (
    <HStack spacing={10} modifiers={[contentShape(shapes.rectangle()), onTapGesture(onOpen)]}>
      <VStack
        spacing={6}
        alignment="leading"
        modifiers={[frame({ maxWidth: Infinity, alignment: 'leading' })]}>
        <Text modifiers={[font({ size: 16, weight: 'semibold' }), lineLimit(1)]}>
          {milestone.name}
        </Text>
        {subtitle ? (
          <Text modifiers={[foregroundStyle(MUTED_GRAY), font({ size: 12 })]}>{subtitle}</Text>
        ) : null}
        <HStack spacing={8}>
          <Text modifiers={[foregroundStyle(MUTED_GRAY), font({ size: 12 })]}>
            {`${completed}/${total}`}
          </Text>
          <ProgressView
            value={percent / 100}
            modifiers={[
              tint(percent >= 100 ? DONE_GREEN : PROGRESS_BLUE),
              frame({ maxWidth: Infinity }),
            ]}
          />
          <Text modifiers={[foregroundStyle(MUTED_GRAY), font({ size: 12 })]}>{`${percent}%`}</Text>
        </HStack>
      </VStack>
      <Image systemName="chevron.right" size={13} color={MUTED_GRAY} />
    </HStack>
  );
}
