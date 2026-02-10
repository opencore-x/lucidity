import * as React from 'react';
import { View, Pressable, Alert } from 'react-native';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import Animated, { SharedValue } from 'react-native-reanimated';
import { useAnimatedStyle } from 'react-native-reanimated';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserAvatar } from '@/components/user-menu';
import { Text } from '@/components/ui/text';
import { MarkdownText } from '@/components/ui/markdown';
import { Separator } from '@/components/ui/separator';
import { MessageCircle, Plus, Sparkles, Trash2 } from '@/lib/icons';
import { useComments, useCreateComment, useDeleteComment } from '@/hooks/useComments';
import { useUser } from '@clerk/clerk-expo';
import type { Comment } from '@lucidity/shared';
import { formatRelativeTime } from '@/utils/helpers';

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

const claudeLogoSource = require('@/assets/images/claude-logo.png');

function ClaudeAvatar() {
  return (
    <Avatar alt="Claude" className="size-5">
      <AvatarImage source={claudeLogoSource} />
      <AvatarFallback>
        <Sparkles size={12} className="text-muted-foreground" />
      </AvatarFallback>
    </Avatar>
  );
}

function CommentBody({ comment }: { comment: Comment }) {
  const { user } = useUser();
  const isClaude = comment.source === 'claude';
  const displayName = isClaude
    ? 'claude'
    : user?.username || user?.fullName?.toLowerCase().replace(/\s+/g, '') || 'you';

  return (
    <View className="px-4 py-3">
      <View className="flex-row items-center gap-2 mb-1.5">
        {isClaude ? <ClaudeAvatar /> : <UserAvatar className="size-5" />}
        <Text className="text-sm font-medium">@{displayName}</Text>
        <Text className="text-xs text-muted-foreground">
          {formatRelativeTime(comment.createdAt)}
        </Text>
      </View>
      <MarkdownText>{comment.content}</MarkdownText>
    </View>
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
      <CommentBody comment={comment} />
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
          className="flex-1 text-base text-foreground font-sans"
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
