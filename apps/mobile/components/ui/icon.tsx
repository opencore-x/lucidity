import { cn } from '@/lib/utils';
import type { LucideIcon, LucideProps } from 'lucide-react-native';
import { styled } from 'nativewind';

type IconProps = LucideProps & {
  as: LucideIcon;
};

function IconImpl({ as: IconComponent, ...props }: IconProps) {
  return <IconComponent {...props} />;
}

const StyledIconImpl = styled(IconImpl, {
  className: {
    target: 'style',
    nativeStyleMapping: {
      height: 'size',
      width: 'size',
    },
  },
});

function Icon({ as: IconComponent, className, size = 14, ...props }: IconProps) {
  return (
    <StyledIconImpl
      as={IconComponent}
      className={cn('text-foreground', className)}
      size={size}
      {...props}
    />
  );
}

export { Icon };
