import * as React from 'react';
import { Modal, View, TextInput, FlatList, Pressable } from 'react-native';
import { useColorScheme } from 'nativewind';
import { Text } from '@/components/ui/text';
import { Search, X } from '@/lib/icons';
import { THEME } from '@/lib/theme';
import type { Task, Project } from '@lucidity/shared';

interface TaskPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (taskId: string | null) => void;
  tasks: Task[];
  projects: Project[];
  currentTaskId: string;
  excludeIds: Set<string>;
}

export function TaskPickerModal({
  visible,
  onClose,
  onSelect,
  tasks,
  projects,
  currentTaskId,
  excludeIds,
}: TaskPickerModalProps) {
  const [search, setSearch] = React.useState('');
  const { colorScheme } = useColorScheme();
  const theme = THEME[colorScheme ?? 'light'];
  const projectMap = React.useMemo(() => {
    const map = new Map<string, string>();
    projects.forEach((p) => map.set(p.id, p.name));
    return map;
  }, [projects]);

  const filteredTasks = React.useMemo(() => {
    const query = search.toLowerCase();
    return tasks.filter(
      (t) =>
        t.id !== currentTaskId &&
        !excludeIds.has(t.id) &&
        t.status !== 'completed' &&
        t.title.toLowerCase().includes(query)
    );
  }, [tasks, currentTaskId, excludeIds, search]);

  const handleSelect = (taskId: string | null) => {
    onSelect(taskId);
    setSearch('');
    onClose();
  };

  const handleClose = () => {
    setSearch('');
    onClose();
  };

  const separator = React.useCallback(
    () => <View style={{ height: 1, backgroundColor: theme.border, marginHorizontal: 16 }} />,
    [theme]
  );

  const renderItem = React.useCallback(
    ({ item }: { item: Task }) => (
      <Pressable
        onPress={() => handleSelect(item.id)}
        style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
        <Text className="text-base text-foreground" numberOfLines={1}>
          {item.title}
        </Text>
        {item.projectId && (
          <Text className="mt-0.5 text-sm text-muted-foreground">
            {projectMap.get(item.projectId) ?? ''}
          </Text>
        )}
      </Pressable>
    ),
    [projectMap]
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}>
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        {/* Grab handle */}
        <View style={{ alignItems: 'center', paddingTop: 8, paddingBottom: 4 }}>
          <View
            style={{
              width: 36,
              height: 5,
              borderRadius: 3,
              backgroundColor: theme.border,
            }}
          />
        </View>

        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderBottomWidth: 1,
            borderBottomColor: theme.border,
          }}>
          <Text className="text-lg font-semibold text-foreground">Parent Task</Text>
          <Pressable onPress={handleClose} hitSlop={8}>
            <X size={20} color={theme.mutedForeground} />
          </Pressable>
        </View>

        {/* Search */}
        <View
          style={{
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderBottomWidth: 1,
            borderBottomColor: theme.border,
          }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: theme.muted,
              borderRadius: 10,
              paddingHorizontal: 12,
              paddingVertical: 8,
            }}>
            <Search size={18} color={theme.mutedForeground} />
            <TextInput
              style={{
                flex: 1,
                marginLeft: 8,
                fontSize: 16,
                color: theme.foreground,
              }}
              placeholder="Search tasks..."
              placeholderTextColor={theme.mutedForeground}
              value={search}
              onChangeText={setSearch}
              autoFocus
              autoCorrect={false}
            />
          </View>
        </View>

        {/* None option */}
        <Pressable
          onPress={() => handleSelect(null)}
          style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
          <Text className="text-base text-muted-foreground">None</Text>
        </Pressable>
        <View style={{ height: 1, backgroundColor: theme.border, marginHorizontal: 16 }} />

        {/* Task list */}
        <FlatList
          data={filteredTasks}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ItemSeparatorComponent={separator}
          keyboardShouldPersistTaps="handled"
        />
      </View>
    </Modal>
  );
}
