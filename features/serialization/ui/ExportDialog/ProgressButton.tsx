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
    if (typeof progress == 'undefined' || progress == null) {
      return '';
    }
    const enabledColor = '#2E2E2E';
    const disabledColor = '#8A8A8A';
    return `linear-gradient(to right, ${enabledColor} ${progress}%, ${disabledColor} ${progress}%)`;
  }, [progress]);

  return (
    <Button {...props} style={{ background: background }}>
      {props.children}
    </Button>
  );
};
