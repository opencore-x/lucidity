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
      <NativeTabs.Trigger name="milestones">
        <Label>Milestones</Label>
        <Icon sf="flag.fill" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="search" role="search">
        <Label>Search</Label>
        <Icon sf="magnifyingglass" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
