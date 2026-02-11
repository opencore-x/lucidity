import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function scheduleTaskReminder(
  taskId: string,
  title: string,
  reminderAt: Date
): Promise<void> {
  const granted = await requestNotificationPermissions();
  if (!granted) return;

  const triggerDate = new Date(reminderAt);
  if (triggerDate.getTime() <= Date.now()) return;

  await cancelTaskReminder(taskId);

  await Notifications.scheduleNotificationAsync({
    identifier: taskId,
    content: {
      title: 'Reminder',
      body: title,
      data: { taskId },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
    },
  });
}

export async function cancelTaskReminder(taskId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(taskId);
}
