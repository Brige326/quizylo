import * as Haptics from 'expo-haptics';
import { useRef } from 'react';
import {
  Animated,
  Pressable,
  type GestureResponderEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

type TappableProps = {
  children: React.ReactNode;
  onPress?: (e: GestureResponderEvent) => void;
  onLongPress?: (e: GestureResponderEvent) => void;
  delayLongPress?: number;
  style?: StyleProp<ViewStyle>;
  haptic?: boolean;
  scaleTo?: number;
  disabled?: boolean;
  hitSlop?: number;
  accessibilityLabel?: string;
};

/** Pression animée (scale) + retour haptique léger. Utilise l'API Animated
 *  (pas de worklet) pour un comportement stable sur Expo Go. */
export function Tappable({
  children,
  onPress,
  onLongPress,
  delayLongPress,
  style,
  haptic = true,
  scaleTo = 0.97,
  disabled,
  hitSlop,
  accessibilityLabel,
}: TappableProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const animate = (to: number, bounciness = 0) =>
    Animated.spring(scale, { toValue: to, useNativeDriver: true, speed: 50, bounciness }).start();

  const handlePress = (e: GestureResponderEvent) => {
    if (haptic) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    onPress?.(e);
  };

  return (
    <Pressable
      disabled={disabled}
      hitSlop={hitSlop}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPressIn={() => animate(scaleTo)}
      onPressOut={() => animate(1, 6)}
      onPress={handlePress}
      onLongPress={onLongPress}
      delayLongPress={delayLongPress}>
      <Animated.View style={[style, { transform: [{ scale }] }, disabled && { opacity: 0.5 }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}
