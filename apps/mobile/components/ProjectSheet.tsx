import * as React from 'react';
import { View, TextInput, Alert, Keyboard } from 'react-native';
import BottomSheet, {
  BottomSheetView,
  BottomSheetBackdrop,
} from '@gorhom/bottom-sheet';
import { useColorScheme } from 'nativewind';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Type, Palette, FileText, Archive } from '@/lib/icons';
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
  const bottomSheetRef = React.useRef<BottomSheet>(null);
  const { colorScheme } = useColorScheme();
  const theme = THEME[colorScheme ?? 'light'];

  const { isOpen, project, closeSheet } = useProjectSheetStore();
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

  const handleSheetChange = React.useCallback(
    (index: number) => {
      if (index === -1) {
        closeSheet();
        setIsEditingName(false);
        setIsEditingDescription(false);
      }
    },
    [closeSheet]
  );

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

  const handleNameSubmit = () => {
    if (nameValue.trim() && nameValue !== project?.name) {
      handleUpdate({ name: nameValue.trim() });
    } else {
      setNameValue(project?.name || '');
    }
    setIsEditingName(false);
  };

  const handleDescriptionSubmit = () => {
    const newDescription = descriptionValue.trim() || undefined;
    if (newDescription !== (project?.description || undefined)) {
      handleUpdate({ description: newDescription });
    }
    setIsEditingDescription(false);
  };

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

  if (!project) {
    return null;
  }

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={0}
      snapPoints={snapPoints}
      onChange={handleSheetChange}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: theme.card }}
      handleIndicatorStyle={{ backgroundColor: theme.border }}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
    >
      <BottomSheetView className="flex-1">
        {/* Header */}
        <View className="px-4 py-4">
          <Text className="text-xl font-semibold text-center">{project.name}</Text>
        </View>

        <Separator />

        {/* Name */}
        <OptionRow icon={<Type size={iconSize} color={iconColor} />} label="Name">
          {isEditingName ? (
            <TextInput
              className="flex-1 text-base text-foreground"
              style={{ height: ROW_HEIGHT, padding: 0, margin: 0 }}
              value={nameValue}
              onChangeText={setNameValue}
              onBlur={handleNameSubmit}
              onSubmitEditing={handleNameSubmit}
              autoFocus
              returnKeyType="done"
              blurOnSubmit
            />
          ) : (
            <Text
              className="flex-1 text-base text-muted-foreground"
              onPress={() => setIsEditingName(true)}
            >
              {project.name}
            </Text>
          )}
        </OptionRow>

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

        {/* Description */}
        <OptionRow icon={<FileText size={iconSize} color={iconColor} />} label="Description">
          {isEditingDescription ? (
            <TextInput
              className="flex-1 text-base text-foreground"
              style={{ height: ROW_HEIGHT, padding: 0, margin: 0 }}
              value={descriptionValue}
              onChangeText={setDescriptionValue}
              onBlur={handleDescriptionSubmit}
              onSubmitEditing={handleDescriptionSubmit}
              autoFocus
              returnKeyType="done"
              blurOnSubmit
              placeholder="Add description..."
              placeholderTextColor="#9CA3AF"
            />
          ) : (
            <Text
              className={`flex-1 text-base ${project.description ? 'text-muted-foreground' : 'text-muted-foreground/50'}`}
              onPress={() => setIsEditingDescription(true)}
            >
              {project.description || 'Add description...'}
            </Text>
          )}
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
      </BottomSheetView>
    </BottomSheet>
  );
}
