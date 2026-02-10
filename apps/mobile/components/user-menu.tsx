import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Text } from '@/components/ui/text';
import { useAuth, useUser } from '@clerk/clerk-expo';
import type { TriggerRef } from '@rn-primitives/popover';
import { useRouter } from 'expo-router';
import { KeyRoundIcon, LogOutIcon } from 'lucide-react-native';
import * as React from 'react';
import { View } from 'react-native';

export function UserMenu() {
  const { user } = useUser();
  const { signOut } = useAuth();
  const router = useRouter();
  const popoverTriggerRef = React.useRef<TriggerRef>(null);

  async function onSignOut() {
    popoverTriggerRef.current?.close();
    await signOut();
  }

  function onApiKeys() {
    popoverTriggerRef.current?.close();
    router.push('/settings');
  }

  return (
    <Popover>
      <PopoverTrigger asChild ref={popoverTriggerRef}>
        <Button variant="ghost" size="icon" className="size-8 rounded-full">
          <UserAvatar />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" side="bottom" sideOffset={-36} className="w-64 p-0">
        <View className="gap-2 p-3">
          <View className="flex-row items-center gap-3 mb-1">
            <UserAvatar className="size-10" />
            <View className="flex-1">
              <Text className="font-medium leading-5">
                {user?.fullName || user?.emailAddresses[0]?.emailAddress}
              </Text>
              {user?.fullName?.length ? (
                <Text className="text-sm font-normal leading-4 text-muted-foreground">
                  {user?.username || user?.emailAddresses[0]?.emailAddress}
                </Text>
              ) : null}
            </View>
          </View>
          <Button
            variant="outline"
            size="sm"
            className="justify-start"
            onPress={onApiKeys}>
            <Icon as={KeyRoundIcon} className="size-4" />
            <Text>API Keys</Text>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="justify-start"
            onPress={onSignOut}>
            <Icon as={LogOutIcon} className="size-4" />
            <Text>Sign Out</Text>
          </Button>
        </View>
      </PopoverContent>
    </Popover>
  );
}

function UserAvatar(props: Omit<React.ComponentProps<typeof Avatar>, 'alt'>) {
  const { user } = useUser();

  const { initials, imageSource, userName } = React.useMemo(() => {
    const userName = user?.fullName || user?.emailAddresses[0]?.emailAddress || 'Unknown';
    const initials = userName
      .split(' ')
      .map((name) => name[0])
      .join('');

    const imageSource = user?.imageUrl ? { uri: user.imageUrl } : undefined;
    return { initials, imageSource, userName };
  }, [user?.imageUrl, user?.fullName, user?.emailAddresses[0]?.emailAddress]);

  return (
    <Avatar alt={`${userName}'s avatar`} {...props}>
      <AvatarImage source={imageSource} />
      <AvatarFallback>
        <Text>{initials}</Text>
      </AvatarFallback>
    </Avatar>
  );
}
