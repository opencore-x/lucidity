import * as React from 'react';
import { View, Pressable, TextInput, ActivityIndicator, Keyboard } from 'react-native';
import { Text } from '@/components/ui/text';
import { Plus } from '@/lib/icons';
import { useCreateProject } from '@/hooks/useProjects';
import { useScrollContext } from '@/contexts/ScrollContext';

export function AddProjectRow() {
  const [isEditing, setIsEditing] = React.useState(false);
  const [value, setValue] = React.useState('');
  const createProject = useCreateProject();
  const isSubmittingRef = React.useRef(false);
  const { scrollToEnd } = useScrollContext();

  React.useEffect(() => {
    if (isEditing) {
      scrollToEnd();
    }
  }, [isEditing, scrollToEnd]);

  const handleSubmit = React.useCallback(() => {
    if (isSubmittingRef.current || createProject.isPending) return;

    if (!value.trim()) {
      setIsEditing(false);
      return;
    }

    isSubmittingRef.current = true;

    createProject.mutate(
      { name: value.trim(), isArchived: false },
      {
        onSettled: () => {
          isSubmittingRef.current = false;
        },
        onSuccess: () => {
          setValue('');
          setIsEditing(false);
          Keyboard.dismiss();
        },
      }
    );
  }, [value, createProject]);

  const handleBlur = React.useCallback(() => {
    if (isSubmittingRef.current || createProject.isPending) return;

    if (!value.trim()) {
      setIsEditing(false);
    } else {
      handleSubmit();
    }
  }, [value, createProject.isPending, handleSubmit]);

  if (isEditing) {
    return (
      <View className="flex-row items-center bg-background py-2 pl-2 pr-4">
        <View className="pr-3">
          <Plus size={20} color="#6B7280" />
        </View>
        <TextInput
          className="flex-1 text-base text-foreground"
          style={{ padding: 0, margin: 0, minHeight: 24 }}
          placeholder="Project name..."
          placeholderTextColor="#9CA3AF"
          value={value}
          onChangeText={setValue}
          onSubmitEditing={handleSubmit}
          onBlur={handleBlur}
          autoFocus
          returnKeyType="done"
          blurOnSubmit
          editable={!createProject.isPending}
        />
        {createProject.isPending && <ActivityIndicator size="small" style={{ marginLeft: 8 }} />}
      </View>
    );
  }

  return (
    <Pressable
      onPress={() => setIsEditing(true)}
      className="flex-row items-center bg-background py-2 pl-2 pr-4 active:bg-muted">
      <View className="pr-3">
        <Plus size={20} color="#6B7280" />
      </View>
      <Text className="text-base text-muted-foreground">Add Project</Text>
    </Pressable>
  );
}
