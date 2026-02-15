import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Text } from '@/components/ui/text';
import { useAuth, useUser } from '@clerk/clerk-expo';
import type { TriggerRef } from '@rn-primitives/popover';
import { useRouter } from 'expo-router';
import { KeyRoundIcon, LogOutIcon, MoonStarIcon, SunIcon } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import * as React from 'react';
import { View } from 'react-native';

export function UserMenu() {
  const { user } = useUser();
  const { signOut } = useAuth();
  const router = useRouter();
  const { colorScheme, setColorScheme } = useColorScheme();
  const popoverTriggerRef = React.useRef<TriggerRef>(null);

  async function onSignOut() {
    popoverTriggerRef.current?.close();
    await signOut();
  }

  function onApiKeys() {
    popoverTriggerRef.current?.close();
    router.push('/settings');
  }

  function onToggleTheme() {
    setColorScheme(colorScheme === 'dark' ? 'light' : 'dark');
  }

  return (
    <Popover>
      <PopoverTrigger asChild ref={popoverTriggerRef}>
        <Button variant="ghost" size="icon" className="size-8 rounded-full">
          <UserAvatar />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" side="bottom" sideOffset={130} className="w-64 p-0">
        <View className="gap-2 p-3">
          <View className="mb-1 flex-row items-center gap-3">
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
          <Button variant="outline" size="sm" className="justify-start" onPress={onToggleTheme}>
            <Icon as={colorScheme === 'dark' ? MoonStarIcon : SunIcon} className="size-4" />
            <Text>{colorScheme === 'dark' ? 'Dark' : 'Light'} Mode</Text>
          </Button>
          <Button variant="outline" size="sm" className="justify-start" onPress={onApiKeys}>
            <Icon as={KeyRoundIcon} className="size-4" />
            <Text>API Keys</Text>
          </Button>
          <Button variant="outline" size="sm" className="justify-start" onPress={onSignOut}>
            <Icon as={LogOutIcon} className="size-4" />
            <Text>Sign Out</Text>
          </Button>
        </View>
      </PopoverContent>
    </Popover>
  );
}

export function UserAvatar(props: Omit<React.ComponentProps<typeof Avatar>, 'alt'>) {
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
