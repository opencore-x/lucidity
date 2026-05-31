import * as React from 'react';
import { Host, BottomSheet, Group, VStack, HStack, Spacer, Button, Image, List } from '@expo/ui/swift-ui';
import {
  frame,
  padding,
  presentationDetents,
  presentationDragIndicator,
  buttonStyle,
  glassEffect,
  textFieldStyle,
  font,
  listStyle,
  scrollDismissesKeyboard,
} from '@expo/ui/swift-ui/modifiers';
import { useColorScheme } from 'nativewind';
import { useProjectSheetStore } from '@/stores/projectSheetStore';
import { useUpdateProject } from '@/hooks/useProjects';
import { EditableField } from '@/components/native/EditableField';
import type { Project, UpdateProject } from '@lucidity/shared';

/**
 * Single global native (@expo/ui) bottom sheet for editing a project — mounted once
 * at the root (signed-in) and driven by `projectSheetStore.isPresented`. Replaces the
 * old @gorhom ProjectSheet, mirroring GlobalTaskSheet's canonical shell: each
 * BottomSheet sits in its own zero-size absolute Host, and the content Group MUST
 * carry `frame({ maxWidth: Infinity })` or the SwiftUI content collapses and the
 * sheet presents invisibly.
 *
 * Phase 3a: inline name + description editing. Color picker + delete land in 3b.
 */
export function GlobalProjectSheet() {
  const { colorScheme } = useColorScheme();
  const scheme = colorScheme === 'dark' ? 'dark' : 'light';

  const isPresented = useProjectSheetStore((s) => s.isPresented);
  const project = useProjectSheetStore((s) => s.project);
  const closeSheet = useProjectSheetStore((s) => s.closeSheet);
  const onDismissed = useProjectSheetStore((s) => s.onDismissed);
  const setProject = useProjectSheetStore((s) => s.updateProject);

  // Optimistic field update; sync the server response back into the store so the
  // open sheet stays fresh (matches GlobalTaskSheet's flow).
  const updateProject = useUpdateProject();
  const handleUpdateField = React.useCallback(
    (data: UpdateProject) => {
      if (!project) return;
      setProject({ ...project, ...data } as Project);
      updateProject.mutate({ id: project.id, data }, { onSuccess: (updated) => setProject(updated) });
    },
    [project, updateProject, setProject]
  );

  // While a field is focused, the top-bar close button becomes a "Done" button that
  // blurs the field (the explicit save affordance for the multiline description).
  const [isEditingText, setIsEditingText] = React.useState(false);
  const blurFieldRef = React.useRef<(() => void) | null>(null);
  const handleFieldFocus = React.useCallback((blur: () => void) => {
    blurFieldRef.current = blur;
    setIsEditingText(true);
  }, []);
  const handleFieldBlur = React.useCallback(() => setIsEditingText(false), []);

  // A circular Liquid Glass icon button (close).
  const circleGlass = [
    buttonStyle('plain'),
    frame({ width: 40, height: 40 }),
    glassEffect({ glass: { variant: 'regular', interactive: true }, shape: 'circle' }),
  ];

  return (
    <Host style={{ position: 'absolute' }} pointerEvents="none" colorScheme={scheme}>
      <BottomSheet
        isPresented={isPresented}
        onIsPresentedChange={(presented) => {
          if (!presented) closeSheet();
        }}
        onDismiss={onDismissed}>
        <Group
          modifiers={[
            frame({ maxWidth: Infinity, maxHeight: Infinity, alignment: 'topLeading' }),
            padding({ top: 28, leading: 8, trailing: 8 }),
            presentationDetents(['medium', 'large']),
            presentationDragIndicator('visible'),
          ]}>
          <VStack spacing={12}>
            {/* Top bar: Done while editing, else close */}
            <HStack spacing={8} modifiers={[padding({ horizontal: 6 })]}>
              <Spacer />
              {isEditingText ? (
                <Button
                  label="Done"
                  onPress={() => blurFieldRef.current?.()}
                  modifiers={[buttonStyle('glassProminent')]}
                />
              ) : (
                <Button onPress={closeSheet} modifiers={circleGlass}>
                  <Image systemName="xmark" size={18} />
                </Button>
              )}
            </HStack>

            {project ? (
              <EditableField
                key={`pname-${project.id}`}
                value={project.name}
                onCommit={(t) => handleUpdateField({ name: t })}
                onFocusEnter={handleFieldFocus}
                onFocusLeave={handleFieldBlur}
                modifiers={[
                  textFieldStyle('plain'),
                  font({ size: 22, weight: 'semibold' }),
                  padding({ leading: 16, trailing: 16 }),
                ]}
              />
            ) : null}

            {project ? (
              <List modifiers={[listStyle('insetGrouped'), scrollDismissesKeyboard('interactively')]}>
                <EditableField
                  key={`pdesc-${project.id}`}
                  value={project.description ?? ''}
                  onCommit={(t) => handleUpdateField({ description: t })}
                  onFocusEnter={handleFieldFocus}
                  onFocusLeave={handleFieldBlur}
                  allowEmpty
                  multiline
                  placeholder="Description…"
                  modifiers={[textFieldStyle('plain')]}
                />
                {/* Color picker + Delete land in 3b */}
              </List>
            ) : null}
          </VStack>
        </Group>
      </BottomSheet>
    </Host>
  );
}
