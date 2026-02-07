import { View, Alert } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { useCallback } from 'react';
import { useCreateProject } from '@/hooks/useProjects';

export default function NewProjectScreen() {
  const createProject = useCreateProject();

  useFocusEffect(
    useCallback(() => {
      Alert.prompt(
        'New Project',
        undefined,
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => router.navigate('/'),
          },
          {
            text: 'Add Project',
            onPress: (name) => {
              if (name?.trim()) {
                createProject.mutate({ name: name.trim(), isArchived: false });
              }
              router.navigate('/');
            },
          },
        ],
        'plain-text'
      );
    }, [createProject])
  );

  return <View className="flex-1 bg-background" />;
}
