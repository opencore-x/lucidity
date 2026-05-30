import * as React from 'react';
import { View, Alert, Pressable, Keyboard } from 'react-native';
import {
  BottomSheetModal,
  BottomSheetView,
  BottomSheetBackdrop,
  BottomSheetTextInput,
} from '@gorhom/bottom-sheet';
import { useColorScheme } from 'nativewind';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Palette, FileText, Trash2 } from '@/lib/icons';
import { useProjectSheetStore } from '@/stores/projectSheetStore';
import { useUpdateProject, useDeleteProject } from '@/hooks/useProjects';
import { THEME } from '@/lib/theme';
import type { UpdateProject } from '@lucidity/shared';

const ROW_HEIGHT = 48;
const iconColor = '#6B7280';
const iconSize = 20;

const PRESET_COLORS = [
  '#EF4444', '#F97316', '#F59E0B', '#EAB308',
  '#84CC16', '#22C55E', '#14B8A6', '#06B6D4',
  '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899',
];

function isValidHex(hex: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(hex);
}

interface OptionRowProps {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}

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

export function ProjectSheet() {
  const { colorScheme } = useColorScheme();
  const theme = THEME[colorScheme === 'dark' ? 'dark' : 'light'];

  const { project, sheetRef, closeSheet, clearProject } = useProjectSheetStore();
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();

  const [isEditingName, setIsEditingName] = React.useState(false);
  const [isEditingDescription, setIsEditingDescription] = React.useState(false);
  const [nameValue, setNameValue] = React.useState('');
  const [descriptionValue, setDescriptionValue] = React.useState('');
  const [hexInput, setHexInput] = React.useState('');

  const snapPoints = React.useMemo(() => ['60%'], []);

  React.useEffect(() => {
    if (project) {
      setNameValue(project.name);
      setDescriptionValue(project.description || '');
      setHexInput(project.color || '');
    }
  }, [project]);

  const handleDismiss = React.useCallback(() => {
    clearProject();
    setIsEditingName(false);
    setIsEditingDescription(false);
  }, [clearProject]);

  const handleUpdate = React.useCallback(
    (data: Partial<UpdateProject>) => {
      if (!project) return;
      updateProject.mutate(
        { id: project.id, data },
        {
          onSuccess: (updatedProject) => {
            useProjectSheetStore.setState({ project: updatedProject });
          },
        }
      );
    },
    [project, updateProject]
  );

  const handleNameSubmit = React.useCallback(() => {
    if (!project) return;
    if (nameValue.trim() && nameValue !== project.name) {
      handleUpdate({ name: nameValue.trim() });
    } else {
      setNameValue(project.name);
    }
    setIsEditingName(false);
    Keyboard.dismiss();
  }, [project, nameValue, handleUpdate]);

  const handleDescriptionSubmit = React.useCallback(() => {
    if (!project) return;
    const trimmed = descriptionValue.trim();
    const newDescription = trimmed || null;
    const currentDescription = project.description || null;
    if (newDescription !== currentDescription) {
      handleUpdate({ description: newDescription ?? undefined });
    }
    setIsEditingDescription(false);
    Keyboard.dismiss();
  }, [project, descriptionValue, handleUpdate]);

  const handleColorSelect = React.useCallback(
    (color: string) => {
      setHexInput(color);
      handleUpdate({ color });
    },
    [handleUpdate]
  );

  const handleHexSubmit = React.useCallback(() => {
    const value = hexInput.startsWith('#') ? hexInput : `#${hexInput}`;
    if (isValidHex(value)) {
      handleUpdate({ color: value });
      setHexInput(value);
    } else {
      setHexInput(project?.color || '');
    }
    Keyboard.dismiss();
  }, [hexInput, project, handleUpdate]);

  const handleDelete = React.useCallback(() => {
    if (!project) return;
    Alert.alert(
      'Delete Project',
      `Delete "${project.name}" and all its tasks?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteProject.mutate(project.id);
            closeSheet();
          },
        },
      ]
    );
  }, [project, deleteProject, closeSheet]);

  const renderBackdrop = React.useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
      />
    ),
    []
  );

  const selectedColor = project?.color || '';

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={snapPoints}
      onDismiss={handleDismiss}
      enableDismissOnClose
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: theme.card }}
      handleIndicatorStyle={{ backgroundColor: theme.border }}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
    >
      <BottomSheetView className="flex-1">
        {project && (
          <>
            {/* Header with inline-editable name and description */}
            <View className="px-4 py-4">
              <View className="flex-row items-center justify-between">
                <View className="flex-1 mr-2">
                  {isEditingName ? (
                    <BottomSheetTextInput
                      className="text-xl font-semibold text-foreground"
                      style={{ padding: 0, margin: 0, minHeight: 28 }}
                      value={nameValue}
                      onChangeText={setNameValue}
                      onBlur={handleNameSubmit}
                      onSubmitEditing={handleNameSubmit}
                      autoFocus
                      returnKeyType="done"
                      blurOnSubmit
                    />
                  ) : (
                    <Pressable onPress={() => setIsEditingName(true)}>
                      <Text className="text-xl font-semibold">
                        {project.name}
                      </Text>
                    </Pressable>
                  )}
                </View>
                {!project.description && !isEditingDescription && (
                  <Pressable
                    onPress={() => setIsEditingDescription(true)}
                    className="p-2"
                    hitSlop={8}
                  >
                    <FileText size={20} color="#9CA3AF" />
                  </Pressable>
                )}
              </View>

              {isEditingDescription ? (
                <BottomSheetTextInput
                  className="text-muted-foreground mt-2"
                  style={{ padding: 0, margin: 0, minHeight: 20 }}
                  value={descriptionValue}
                  onChangeText={setDescriptionValue}
                  onBlur={handleDescriptionSubmit}
                  onSubmitEditing={handleDescriptionSubmit}
                  autoFocus
                  returnKeyType="done"
                  blurOnSubmit
                  placeholder="Add description..."
                  placeholderTextColor="#9CA3AF"
                  multiline
                />
              ) : project.description ? (
                <Pressable onPress={() => setIsEditingDescription(true)} className="mt-1">
                  <Text className="text-muted-foreground">{project.description}</Text>
                </Pressable>
              ) : null}
            </View>

            <Separator />

            {/* Color picker */}
            <OptionRow icon={<Palette size={iconSize} color={iconColor} />} label="Color">
              <View />
            </OptionRow>
            <View className="px-4 pb-3">
              <View className="flex-row flex-wrap gap-3">
                {PRESET_COLORS.map((color) => (
                  <Pressable
                    key={color}
                    onPress={() => handleColorSelect(color)}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      backgroundColor: color,
                      borderWidth: selectedColor === color ? 3 : 0,
                      borderColor: selectedColor === color ? theme.foreground : 'transparent',
                    }}
                  />
                ))}
              </View>
              {/* Custom hex input */}
              <View className="flex-row items-center mt-3 gap-2">
                <View
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    backgroundColor: isValidHex(hexInput.startsWith('#') ? hexInput : `#${hexInput}`)
                      ? (hexInput.startsWith('#') ? hexInput : `#${hexInput}`)
                      : '#D1D5DB',
                  }}
                />
                <BottomSheetTextInput
                  className="flex-1 text-sm text-foreground"
                  style={{
                    height: 36,
                    paddingHorizontal: 10,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: theme.border,
                  }}
                  value={hexInput}
                  onChangeText={setHexInput}
                  onSubmitEditing={handleHexSubmit}
                  onBlur={handleHexSubmit}
                  placeholder="#hex color"
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="done"
                  blurOnSubmit
                />
              </View>
            </View>

            <Separator />

            {/* Delete Button */}
            <View className="px-4 py-6">
              <Button
                variant="outline"
                className="border-destructive"
                onPress={handleDelete}
              >
                <Trash2 size={18} color="#EF4444" />
                <Text className="text-destructive ml-2">Delete Project</Text>
              </Button>
            </View>
          </>
        )}
      </BottomSheetView>
    </BottomSheetModal>
  );
}
