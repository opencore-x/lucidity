import { NativeTabs, Icon, Label } from 'expo-router/unstable-native-tabs';

export default function TabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Label>Projects</Label>
        <Icon sf="folder.fill" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="today">
        <Label>Today</Label>
        <Icon sf="sun.max.fill" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
