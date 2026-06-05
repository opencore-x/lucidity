import * as React from 'react';
import {
  Host,
  BottomSheet,
  Group,
  VStack,
  HStack,
  ZStack,
  Spacer,
  Button,
  Image,
  Text,
  List,
  Section,
  Grid,
  ColorPicker,
} from '@expo/ui/swift-ui';
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
  foregroundStyle,
  onTapGesture,
  contentShape,
  shapes,
  labelsHidden,
} from '@expo/ui/swift-ui/modifiers';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useProjectSheetStore } from '@/stores/projectSheetStore';
import { useUpdateProject, useDeleteProject } from '@/hooks/useProjects';
import { useTasks } from '@/hooks/useTasks';
import { EditableField } from '@/components/native/EditableField';
import type { Project, UpdateProject } from '@lucidity/shared';

const ICON_BLUE = '#0A84FF';
const ICON_SIZE = 22;
const ICON_COL = 30;
// iOS system red for the destructive delete action.
const DESTRUCTIVE_RED = '#FF3B30';

// The same 12 swatches the old @gorhom ProjectSheet offered (uppercase #RRGGBB so
// they compare cleanly against the stored color).
const PRESET_COLORS = [
  '#EF4444',
  '#F97316',
  '#F59E0B',
  '#EAB308',
  '#84CC16',
  '#22C55E',
  '#14B8A6',
  '#06B6D4',
  '#3B82F6',
  '#6366F1',
  '#8B5CF6',
  '#EC4899',
];

// The schema stores color as exactly 7 chars (#RRGGBB), so strip any alpha the
// system ColorPicker may hand back and normalize to uppercase.
function normalizeHex(hex: string): string {
  return (hex.length >= 7 ? hex.slice(0, 7) : hex).toUpperCase();
}

/** A tappable preset color circle; the selected one carries a white checkmark. */
function ColorSwatch({
  color,
  selected,
  onPress,
}: {
  color: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <ZStack
      modifiers={[
        frame({ width: 32, height: 32 }),
        contentShape(shapes.circle()),
        onTapGesture(onPress),
      ]}>
      <Image systemName="circle.fill" size={28} color={color} />
      {selected ? <Image systemName="checkmark" size={13} color="#FFFFFF" /> : null}
    </ZStack>
  );
}

/**
 * Single global native (@expo/ui) bottom sheet for editing a project — mounted once
 * at the root (signed-in) and driven by `projectSheetStore.isPresented`. Replaces the
 * old @gorhom ProjectSheet, mirroring GlobalTaskSheet's canonical shell: each
 * BottomSheet sits in its own zero-size absolute Host, and the content Group MUST
 * carry `frame({ maxWidth: Infinity })` or the SwiftUI content collapses and the
 * sheet presents invisibly.
 *
 * Inline name + multiline description, a color picker (preset swatches + the native
 * system ColorPicker for custom), and a destructive delete.
 */
export function GlobalProjectSheet() {
  const { colorScheme } = useColorScheme();
  const scheme = colorScheme === 'dark' ? 'dark' : 'light';

  const isPresented = useProjectSheetStore((s) => s.isPresented);
  const project = useProjectSheetStore((s) => s.project);
  const closeSheet = useProjectSheetStore((s) => s.closeSheet);
  const onDismissed = useProjectSheetStore((s) => s.onDismissed);
  const setProject = useProjectSheetStore((s) => s.updateProject);

  const router = useRouter();
  const { data: tasks = [] } = useTasks();
  const deleteProject = useDeleteProject();

  // Optimistic field update; sync the server response back into the store so the
  // open sheet stays fresh (matches GlobalTaskSheet's flow).
  const updateProject = useUpdateProject();
  const handleUpdateField = React.useCallback(
    (data: UpdateProject) => {
      if (!project) return;
      setProject({ ...project, ...data } as Project);
      updateProject.mutate(
        { id: project.id, data },
        { onSuccess: (updated) => setProject(updated) }
      );
    },
    [project, updateProject, setProject]
  );

  // Confirm first, then delete and return to the landing. The editor is opened from
  // the project's detail screen, so once the project is gone that screen behind the
  // sheet is no longer valid — pop back to the list.
  const handleDelete = React.useCallback(() => {
    if (!project) return;
    const count = tasks.filter((t) => t.projectId === project.id).length;
    Alert.alert('Delete Project', `Delete "${project.name}" and all ${count} of its tasks?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          closeSheet();
          deleteProject.mutate(project.id);
          if (router.canGoBack()) router.back();
        },
      },
    ]);
  }, [project, tasks, closeSheet, deleteProject, router]);

  // While a field is focused, the top-bar close button becomes a "Done" button that
  // blurs the field (the explicit save affordance for the multiline description).
  const [isEditingText, setIsEditingText] = React.useState(false);
  const blurFieldRef = React.useRef<(() => void) | null>(null);
  const handleFieldFocus = React.useCallback((blur: () => void) => {
    blurFieldRef.current = blur;
    setIsEditingText(true);
  }, []);
  const handleFieldBlur = React.useCallback(() => setIsEditingText(false), []);

  const selectedColor = (project?.color ?? '').toUpperCase();

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
                // Prominent blue-filled circle (glassProminent) with a white tick — the
                // blue background reads as a clear "save" affordance. Same 40×40 footprint
                // as the close button so the top bar stays aligned when editing begins.
                <Button
                  onPress={() => blurFieldRef.current?.()}
                  modifiers={[buttonStyle('glassProminent'), frame({ width: 40, height: 40 })]}>
                  <Image systemName="checkmark" size={18} color="#FFFFFF" />
                </Button>
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
              <List
                modifiers={[listStyle('insetGrouped'), scrollDismissesKeyboard('interactively')]}>
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

                {/* Color — preset swatches + the native system picker for custom */}
                <Section>
                  <Grid
                    horizontalSpacing={12}
                    verticalSpacing={12}
                    modifiers={[padding({ vertical: 6 })]}>
                    <Grid.Row>
                      {PRESET_COLORS.slice(0, 6).map((c) => (
                        <ColorSwatch
                          key={c}
                          color={c}
                          selected={selectedColor === c}
                          onPress={() => {
                            if (selectedColor !== c) handleUpdateField({ color: c });
                          }}
                        />
                      ))}
                    </Grid.Row>
                    <Grid.Row>
                      {PRESET_COLORS.slice(6).map((c) => (
                        <ColorSwatch
                          key={c}
                          color={c}
                          selected={selectedColor === c}
                          onPress={() => {
                            if (selectedColor !== c) handleUpdateField({ color: c });
                          }}
                        />
                      ))}
                    </Grid.Row>
                  </Grid>

                  <HStack spacing={8}>
                    <Image
                      systemName="paintpalette"
                      size={ICON_SIZE}
                      color={ICON_BLUE}
                      modifiers={[frame({ width: ICON_COL })]}
                    />
                    <Text>Custom</Text>
                    <Spacer />
                    <ColorPicker
                      selection={project.color}
                      supportsOpacity={false}
                      onSelectionChange={(hex) => handleUpdateField({ color: normalizeHex(hex) })}
                      modifiers={[labelsHidden()]}
                    />
                  </HStack>
                </Section>

                {/* Destructive delete — its own card, centered red text */}
                <Section>
                  <HStack
                    modifiers={[contentShape(shapes.rectangle()), onTapGesture(handleDelete)]}>
                    <Spacer />
                    <Text modifiers={[foregroundStyle(DESTRUCTIVE_RED)]}>Delete Project</Text>
                    <Spacer />
                  </HStack>
                </Section>
              </List>
            ) : null}
          </VStack>
        </Group>
      </BottomSheet>
    </Host>
  );
}
