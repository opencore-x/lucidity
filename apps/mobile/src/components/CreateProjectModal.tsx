import * as React from 'react';
import {
  Modal,
  View,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { Text, Input, Button } from '@/components/ui';
import { useCreateProject } from '@/hooks/useProjects';

interface CreateProjectModalProps {
  visible: boolean;
  onClose: () => void;
}

export function CreateProjectModal({ visible, onClose }: CreateProjectModalProps) {
  const [name, setName] = React.useState('');
  const createProject = useCreateProject();

  const handleCreate = async () => {
    if (!name.trim()) return;

    try {
      await createProject.mutateAsync({ name: name.trim(), isArchived: false });
      setName('');
      onClose();
    } catch (error) {
      // Error handling is done by React Query
    }
  };

  const handleClose = () => {
    setName('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <Pressable
          className="flex-1 bg-black/50 justify-center items-center px-6"
          onPress={handleClose}
        >
          <Pressable
            className="w-full bg-background rounded-xl p-6"
            onPress={(e) => e.stopPropagation()}
          >
            <Text className="text-xl font-semibold mb-4">New Project</Text>

            <Input
              placeholder="Project name"
              value={name}
              onChangeText={setName}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleCreate}
            />

            <View className="flex-row gap-3 mt-6">
              <Button
                variant="outline"
                className="flex-1"
                onPress={handleClose}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onPress={handleCreate}
                disabled={!name.trim() || createProject.isPending}
              >
                {createProject.isPending ? 'Creating...' : 'Create'}
              </Button>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}
