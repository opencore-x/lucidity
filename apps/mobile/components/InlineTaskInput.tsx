import * as React from 'react';
import { View, TextInput } from 'react-native';
import { Plus } from '@/lib/icons';
import { useCreateTask } from '@/hooks/useTasks';
import { useScrollContext } from '@/contexts/ScrollContext';

interface InlineTaskInputProps {
  projectId: string | null;
  onComplete: () => void;
  autoFocus?: boolean;
}

export function InlineTaskInput({
  projectId,
  onComplete,
  autoFocus = false,
}: InlineTaskInputProps) {
  const [value, setValue] = React.useState('');
  const createTask = useCreateTask();
  const inputRef = React.useRef<TextInput>(null);
  const viewRef = React.useRef<View>(null);
  const isSubmittingRef = React.useRef(false);
  const { scrollViewRef } = useScrollContext();

  React.useEffect(() => {
    if (autoFocus && viewRef.current && scrollViewRef.current) {
      setTimeout(() => {
        viewRef.current?.measureLayout(
          scrollViewRef.current as any,
          (_x, y) => {
            scrollViewRef.current?.scrollTo({ y: y - 100, animated: true });
          },
          () => {}
        );
      }, 100);
    }
  }, [autoFocus, scrollViewRef]);

  const handleSubmit = React.useCallback(() => {
    if (isSubmittingRef.current || createTask.isPending) return;

    if (!value.trim()) {
      onComplete();
      return;
    }

    isSubmittingRef.current = true;
    const taskTitle = value.trim();

    // Clear input but keep it open for rapid entry
    setValue('');

    createTask.mutate(
      {
        title: taskTitle,
        projectId,
        status: 'pending',
        priority: 500,
      },
      {
        onSettled: () => {
          isSubmittingRef.current = false;
        },
      }
    );
  }, [value, projectId, createTask, onComplete]);

  const handleBlur = React.useCallback(() => {
    if (isSubmittingRef.current || createTask.isPending) return;

    if (value.trim()) {
      isSubmittingRef.current = true;
      const taskTitle = value.trim();
      setValue('');

      createTask.mutate(
        {
          title: taskTitle,
          projectId,
          status: 'pending',
          priority: 500,
        },
        {
          onSettled: () => {
            isSubmittingRef.current = false;
          },
        }
      );
    }

    onComplete();
  }, [value, projectId, createTask, onComplete]);

  return (
    <View ref={viewRef} className="flex-row items-center px-4 py-3">
      <Plus size={18} color="#9CA3AF" />
      <TextInput
        ref={inputRef}
        className="flex-1 text-base text-foreground ml-2 font-sans"
        style={{ padding: 0, margin: 0, minHeight: 24 }}
        placeholder="New task"
        placeholderTextColor="#9CA3AF"
        value={value}
        onChangeText={setValue}
        onSubmitEditing={handleSubmit}
        onBlur={handleBlur}
        autoFocus={autoFocus}
        returnKeyType="done"
        blurOnSubmit={false}
      />
    </View>
  );
}
