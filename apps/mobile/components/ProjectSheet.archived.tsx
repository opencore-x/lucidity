import * as React from 'react';
import { View, TextInput, Alert, Pressable, Keyboard } from 'react-native';
import {
  BottomSheetModal,
  BottomSheetView,
  BottomSheetBackdrop,
} from '@gorhom/bottom-sheet';
import { useColorScheme } from 'nativewind';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Palette, FileText, Archive } from '@/lib/icons';
import { useProjectSheetStore } from '@/stores/projectSheetStore';
import { useUpdateProject } from '@/hooks/useProjects';
import { THEME } from '@/lib/theme';
import type { UpdateProject } from '@lucidity/shared';

const ROW_HEIGHT = 48;
const iconColor = '#6B7280';
const iconSize = 20;

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

  const [isEditingName, setIsEditingName] = React.useState(false);
  const [isEditingDescription, setIsEditingDescription] = React.useState(false);
  const [nameValue, setNameValue] = React.useState('');
  const [descriptionValue, setDescriptionValue] = React.useState('');

  const snapPoints = React.useMemo(() => ['50%'], []);

  // Sync local state when project changes
  React.useEffect(() => {
    if (project) {
      setNameValue(project.name);
      setDescriptionValue(project.description || '');
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
            // Update store with fresh data to keep UI in sync
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

  const handleArchive = () => {
    Alert.alert(
      'Archive Project',
      `Are you sure you want to archive "${project?.name}"? The project and its tasks will be hidden but not deleted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive',
          style: 'destructive',
          onPress: () => {
            handleUpdate({ isArchived: true });
            closeSheet();
          },
        },
      ]
    );
  };

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
              {/* Name row with optional description icon */}
              <View className="flex-row items-center justify-between">
                <View className="flex-1 mr-2">
                  {isEditingName ? (
                    <TextInput
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
                {/* Show add description icon only when no description and not editing */}
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

              {/* Description section */}
              {isEditingDescription ? (
                <TextInput
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

            {/* Color */}
            <OptionRow icon={<Palette size={iconSize} color={iconColor} />} label="Color">
              <View className="flex-row items-center">
                <View
                  className="w-6 h-6 rounded-full mr-2"
                  style={{ backgroundColor: project.color || '#3B82F6' }}
                />
                <Text className="text-base text-muted-foreground">
                  {project.color || 'Blue'}
                </Text>
              </View>
            </OptionRow>

            <Separator />

            {/* Archive Button */}
            <View className="px-4 py-6">
              <Button
                variant="outline"
                className="border-destructive"
                onPress={handleArchive}
              >
                <Archive size={18} color="#EF4444" />
                <Text className="text-destructive ml-2">Archive Project</Text>
              </Button>
            </View>
          </>
        )}
      </BottomSheetView>
    </BottomSheetModal>
  );
}
