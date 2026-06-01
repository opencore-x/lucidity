import type { Deliverer } from './types.js';
import { MacNotificationDeliverer } from './macNotification.js';
import { NoopDeliverer } from './noop.js';

/** Supported delivery channels. `push` (Expo) is a future addition. */
export type DeliveryChannel = 'macos' | 'stdout';

export const DELIVERY_CHANNELS: readonly DeliveryChannel[] = ['macos', 'stdout'];

export function isDeliveryChannel(value: unknown): value is DeliveryChannel {
  return typeof value === 'string' && (DELIVERY_CHANNELS as readonly string[]).includes(value);
}

export function createDeliverer(channel: DeliveryChannel): Deliverer {
  switch (channel) {
    case 'macos':
      return new MacNotificationDeliverer();
    case 'stdout':
      return new NoopDeliverer();
  }
}

export type { Deliverer, DeliveryMessage } from './types.js';
export { MacNotificationDeliverer } from './macNotification.js';
export { NoopDeliverer } from './noop.js';
