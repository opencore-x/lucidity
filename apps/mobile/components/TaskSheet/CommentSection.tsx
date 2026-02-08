import * as React from 'react';
import { View, Pressable, Alert } from 'react-native';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import Animated, { SharedValue } from 'react-native-reanimated';
import { useAnimatedStyle } from 'react-native-reanimated';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { Text } from '@/components/ui/text';
import { Separator } from '@/components/ui/separator';
import { MessageCircle, Plus, Trash2 } from '@/lib/icons';
import { useComments, useCreateComment, useDeleteComment } from '@/hooks/useComments';
import type { Comment } from '@lucidity/shared';

function formatRelativeTime(date: Date): string {
  const now = Date.now();
  const diff = now - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function RightAction({
  drag,
  onDelete,
}: {
  drag: SharedValue<number>;
  onDelete: () => void;
}) {
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: drag.value + 80 }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={onDelete}
        className="bg-destructive justify-center items-center w-20 h-full"
      >
        <Trash2 size={24} color="#FFFFFF" />
      </Pressable>
    </Animated.View>
  );
}

function CommentItem({
  comment,
  onDelete,
}: {
  comment: Comment;
  onDelete: (commentId: string) => void;
}) {
  const swipeableRef = React.useRef<React.ComponentRef<typeof ReanimatedSwipeable>>(null);

  const handleDelete = React.useCallback(() => {
    Alert.alert(
      'Delete Comment',
      'Are you sure you want to delete this comment?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => swipeableRef.current?.close(),
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDelete(comment.id),
        },
      ]
    );
  }, [comment.id, onDelete]);

  const renderRightActions = React.useCallback(
    (_prog: SharedValue<number>, drag: SharedValue<number>) => {
      return <RightAction drag={drag} onDelete={handleDelete} />;
    },
    [handleDelete]
  );

  return (
    <ReanimatedSwipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      overshootRight={false}
      friction={2}
      rightThreshold={40}
    >
      <View className="px-4 py-3">
        <Text className="text-base text-foreground">{comment.content}</Text>
        <Text className="text-xs text-muted-foreground mt-1">
          {formatRelativeTime(comment.createdAt)}
        </Text>
      </View>
    </ReanimatedSwipeable>
  );
}

interface CommentSectionProps {
  taskId: string;
}

export function CommentSection({ taskId }: CommentSectionProps) {
  const [newComment, setNewComment] = React.useState('');
  const { data: comments } = useComments(taskId);
  const createComment = useCreateComment();
  const deleteComment = useDeleteComment();

  const handleAddComment = React.useCallback(() => {
    const trimmed = newComment.trim();
    if (!trimmed) return;

    createComment.mutate(
      { taskId, content: trimmed },
      { onSuccess: () => setNewComment('') }
    );
  }, [newComment, taskId, createComment]);

  const handleDeleteComment = React.useCallback(
    (commentId: string) => {
      deleteComment.mutate({ taskId, commentId });
    },
    [taskId, deleteComment]
  );

  const count = comments?.length ?? 0;

  return (
    <View className="mt-2">
      <Separator />

      <View className="flex-row items-center px-4 py-3">
        <MessageCircle size={18} color="#6B7280" />
        <Text className="text-sm font-medium text-muted-foreground ml-2">
          Comments{count > 0 ? ` (${count})` : ''}
        </Text>
      </View>

      {comments?.map((comment) => (
        <React.Fragment key={comment.id}>
          <Separator />
          <CommentItem comment={comment} onDelete={handleDeleteComment} />
        </React.Fragment>
      ))}

      <Separator />

      <View className="flex-row items-center px-4" style={{ minHeight: 48 }}>
        <View className="w-5 mr-3 items-center">
          <Plus size={20} color="#9CA3AF" />
        </View>
        <BottomSheetTextInput
          className="flex-1 text-base text-foreground"
          style={{ height: 48, padding: 0, margin: 0 }}
          placeholder="Add comment"
          placeholderTextColor="#9CA3AF"
          value={newComment}
          onChangeText={setNewComment}
          onSubmitEditing={handleAddComment}
          returnKeyType="done"
        />
      </View>
    </View>
  );
}
