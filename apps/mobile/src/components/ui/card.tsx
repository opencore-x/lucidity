import * as React from 'react';
import { View, type ViewProps } from 'react-native';
import { cn } from '@/lib/utils';
import { Text } from './text';

interface CardProps extends ViewProps {
  className?: string;
}

const Card = React.forwardRef<View, CardProps>(
  ({ className, ...props }, ref) => {
    return (
      <View
        ref={ref}
        className={cn(
          'rounded-lg border border-border bg-card shadow-sm',
          className
        )}
        {...props}
      />
    );
  }
);
Card.displayName = 'Card';

const CardHeader = React.forwardRef<View, CardProps>(
  ({ className, ...props }, ref) => {
    return (
      <View
        ref={ref}
        className={cn('flex flex-col space-y-1.5 p-4', className)}
        {...props}
      />
    );
  }
);
CardHeader.displayName = 'CardHeader';

interface CardTitleProps extends ViewProps {
  className?: string;
  children?: React.ReactNode;
}

const CardTitle = React.forwardRef<View, CardTitleProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <Text
        className={cn('text-lg font-semibold leading-none tracking-tight', className)}
        {...props}
      >
        {children}
      </Text>
    );
  }
);
CardTitle.displayName = 'CardTitle';

const CardContent = React.forwardRef<View, CardProps>(
  ({ className, ...props }, ref) => {
    return <View ref={ref} className={cn('p-4 pt-0', className)} {...props} />;
  }
);
CardContent.displayName = 'CardContent';

export { Card, CardHeader, CardTitle, CardContent };
export type { CardProps, CardTitleProps };
