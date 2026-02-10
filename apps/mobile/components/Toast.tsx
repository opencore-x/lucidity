import * as React from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/text';
import { useToastStore } from '@/stores/toastStore';

export function Toast() {
  const { visible, message, handleUndo } = useToastStore();
  const insets = useSafeAreaInsets();

  if (!visible) return null;

  return (
    <Animated.View
      entering={FadeInDown.duration(250)}
      exiting={FadeOutDown.duration(200)}
      style={{
        position: 'absolute',
        bottom: insets.bottom + 60,
        left: 16,
        right: 16,
      }}
      pointerEvents="box-none"
    >
      <View
        style={{
          backgroundColor: '#1F2937',
          borderRadius: 12,
          paddingHorizontal: 16,
          paddingVertical: 12,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.2,
          shadowRadius: 8,
          elevation: 6,
        }}
      >
        <Text style={{ color: '#F9FAFB', fontSize: 14 }}>{message}</Text>
        <Pressable onPress={handleUndo} hitSlop={8}>
          <Text style={{ color: '#60A5FA', fontSize: 14, fontWeight: '600' }}>Undo</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}
