import { Button, ButtonProps } from '@/shared/ui/Button';
import { useMemo } from 'react';

interface ProgressButtonProps {
  progress?: number;
}

export const ProgressButton: React.FC<ButtonProps & ProgressButtonProps> = ({
  progress,
  ...props
}) => {
  const background = useMemo(() => {
    if (typeof progress === 'undefined' || progress === null) {
      return undefined;
    }
    const enabledColor = `var(--primary)`;
    const disabledColor = `var(--muted)`;
    return `linear-gradient(to right, ${enabledColor} ${progress}%, ${disabledColor} ${progress}%)`;
  }, [progress]);

  const textColor =
    typeof progress !== 'undefined' ? 'text-primary-foreground' : '';

  return (
    <Button
      variant={'outline'}
      {...props}
      className={`h-10 max-h-10 min-h-10 ${props.className || ''} ${textColor}`}
      style={{ ...props.style, background }}
    >
      {props.children}
    </Button>
  );
};
