import { Stack } from 'expo-router';
import { LARGE_TITLE_SCREEN_OPTIONS } from '@/lib/headerConfig';

export default function SearchLayout() {
  return <Stack screenOptions={LARGE_TITLE_SCREEN_OPTIONS} />;
}
