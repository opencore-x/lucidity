import { NativeOnlyAnimatedView } from '@/components/ui/native-only-animated-view';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';
import * as SelectPrimitive from '@rn-primitives/select';
import { Check, ChevronDown } from 'lucide-react-native';
import * as React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { FadeIn, FadeOut } from 'react-native-reanimated';
import { FullWindowOverlay as RNFullWindowOverlay } from 'react-native-screens';

const Select = SelectPrimitive.Root;

const SelectGroup = SelectPrimitive.Group;

const SelectValue = SelectPrimitive.Value;

const FullWindowOverlay = Platform.OS === 'ios' ? RNFullWindowOverlay : React.Fragment;

const SelectTrigger = React.forwardRef<
  SelectPrimitive.TriggerRef,
  SelectPrimitive.TriggerProps & { className?: string }
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      'flex h-10 native:h-12 flex-row items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground',
      props.disabled && 'opacity-50',
      className
    )}
    {...props}
  >
    <>{children}</>
    <Icon as={ChevronDown} size={16} className="text-muted-foreground" />
  </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

function SelectContent({
  className,
  children,
  position = 'popper',
  portalHost,
  ...props
}: SelectPrimitive.ContentProps &
  React.RefAttributes<SelectPrimitive.ContentRef> & {
    portalHost?: string;
  }) {
  return (
    <SelectPrimitive.Portal hostName={portalHost}>
      <FullWindowOverlay>
        <SelectPrimitive.Overlay style={Platform.select({ native: StyleSheet.absoluteFill })}>
          <NativeOnlyAnimatedView entering={FadeIn.duration(200)} exiting={FadeOut}>
            <SelectPrimitive.Content
              position={position}
              className={cn(
                'relative z-50 max-h-96 min-w-[8rem] rounded-md border border-border bg-popover shadow-md shadow-black/5',
                position === 'popper' &&
                  'data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1',
                className
              )}
              {...props}
            >
              <SelectPrimitive.Viewport
                className={cn(
                  'p-1',
                  position === 'popper' &&
                    'h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]'
                )}
              >
                {children}
              </SelectPrimitive.Viewport>
            </SelectPrimitive.Content>
          </NativeOnlyAnimatedView>
        </SelectPrimitive.Overlay>
      </FullWindowOverlay>
    </SelectPrimitive.Portal>
  );
}

const SelectLabel = React.forwardRef<
  SelectPrimitive.LabelRef,
  SelectPrimitive.LabelProps & { className?: string }
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn('px-2 py-1.5 text-sm font-semibold text-popover-foreground', className)}
    {...props}
  />
));
SelectLabel.displayName = SelectPrimitive.Label.displayName;

const SelectItem = React.forwardRef<
  SelectPrimitive.ItemRef,
  SelectPrimitive.ItemProps & { className?: string }
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      'relative flex w-full flex-row items-center rounded-sm py-2 pl-8 pr-2 active:bg-accent',
      props.disabled && 'opacity-50',
      className
    )}
    {...props}
  >
    <View className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Icon as={Check} size={16} className="text-popover-foreground" />
      </SelectPrimitive.ItemIndicator>
    </View>
    <SelectPrimitive.ItemText className="text-sm text-popover-foreground" />
  </SelectPrimitive.Item>
));
SelectItem.displayName = SelectPrimitive.Item.displayName;

const SelectSeparator = React.forwardRef<
  SelectPrimitive.SeparatorRef,
  SelectPrimitive.SeparatorProps & { className?: string }
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn('-mx-1 my-1 h-px bg-muted', className)}
    {...props}
  />
));
SelectSeparator.displayName = SelectPrimitive.Separator.displayName;

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
  type SelectPrimitive,
};
