import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { Palette, Type } from '@/constants/theme';

type Variant = keyof typeof Type;

export type TextProps = RNTextProps & {
  variant?: Variant;
  color?: string;
  center?: boolean;
};

export function Text({
  variant = 'body',
  color = Palette.text,
  center,
  style,
  ...rest
}: TextProps) {
  return (
    <RNText
      {...rest}
      style={[Type[variant], { color }, center && { textAlign: 'center' }, style]}
    />
  );
}
