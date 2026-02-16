import { useEffect } from 'react';
import * as QuickActions from 'expo-quick-actions';
import { useRouter } from 'expo-router';

export function useQuickActions() {
  const router = useRouter();

  useEffect(() => {
    // Set up quick action items
    QuickActions.setItems([
      {
        id: '0',
        title: 'Add Task',
        icon: 'add',
        params: { action: 'add-task' },
      },
    ]);

    // Check for initial quick action (app launched from quick action)
    const checkInitial = async () => {
      const initialAction = await QuickActions.initial;
      if (initialAction?.params?.action === 'add-task') {
        router.push('/(tabs)/(index)?quickCapture=true');
      }
    };

    checkInitial();

    // Listen for quick actions while app is running
    const subscription = QuickActions.addListener((action) => {
      if (action?.params?.action === 'add-task') {
        router.push('/(tabs)/(index)?quickCapture=true');
      }
    });

    return () => {
      subscription.remove();
    };
  }, [router]);
}
