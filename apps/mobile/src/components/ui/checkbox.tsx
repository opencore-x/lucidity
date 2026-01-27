import * as React from 'react';
import { Pressable, View } from 'react-native';
import { cn } from '@/lib/utils';
import { Check } from '@/lib/icons';

interface CheckboxProps {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

const Checkbox = React.forwardRef<View, CheckboxProps>(
  ({ checked = false, onCheckedChange, disabled = false, className }, ref) => {
    return (
      <Pressable
        ref={ref}
        role="checkbox"
        aria-checked={checked}
        disabled={disabled}
        onPress={() => onCheckedChange?.(!checked)}
        className={cn(
          'h-5 w-5 shrink-0 rounded border border-primary items-center justify-center',
          checked && 'bg-primary',
          disabled && 'opacity-50',
          className
        )}
      >
        {checked && <Check size={14} color="white" strokeWidth={3} />}
      </Pressable>
    );
  }
);

Checkbox.displayName = 'Checkbox';

export { Checkbox };
export type { CheckboxProps };
