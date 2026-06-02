import * as React from 'react';
import { HStack, VStack, Image, Text as UIText } from '@expo/ui/swift-ui';
import {
  frame,
  foregroundStyle,
  font,
  lineLimit,
  contentShape,
  onTapGesture,
  shapes,
  padding,
} from '@expo/ui/swift-ui/modifiers';
import type { NoteSummary } from '@/lib/notes';

const MUTED_GRAY = '#8E8E93';
const NOTE_BLUE = '#0A84FF';

function folderOf(path: string): string {
  const idx = path.lastIndexOf('/');
  return idx === -1 ? '' : path.slice(0, idx);
}

export function NoteRow({ note, onOpen }: { note: NoteSummary; onOpen: () => void }) {
  const folder = folderOf(note.path);
  return (
    <HStack
      spacing={10}
      modifiers={[contentShape(shapes.rectangle()), onTapGesture(onOpen), padding({ vertical: 2 })]}>
      <Image systemName="doc.text" size={20} color={NOTE_BLUE} />
      <VStack spacing={2} alignment="leading" modifiers={[frame({ maxWidth: Infinity, alignment: 'leading' })]}>
        <UIText modifiers={[lineLimit(1), frame({ maxWidth: Infinity, alignment: 'leading' })]}>
          {note.title}
        </UIText>
        {folder ? (
          <UIText modifiers={[font({ size: 12 }), foregroundStyle(MUTED_GRAY), lineLimit(1)]}>
            {folder}
          </UIText>
        ) : null}
      </VStack>
      <Image systemName="chevron.right" size={12} color={MUTED_GRAY} />
    </HStack>
  );
}
