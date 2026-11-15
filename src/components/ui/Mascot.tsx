import { StyleSheet, View } from 'react-native';

import { Palette } from '@/constants/theme';

/**
 * Mascotte Quizylo — forme simple et originale (blob violet à deux yeux),
 * construite en Views pour éviter un module natif. Taille paramétrable.
 */
export function Mascot({ size = 96 }: { size?: number }) {
  const eye = Math.max(6, size * 0.14);
  const pupil = eye * 0.5;
  return (
    <View
      style={[
        styles.body,
        {
          width: size,
          height: size * 1.05,
          borderRadius: size * 0.5,
          borderBottomLeftRadius: size * 0.42,
          borderBottomRightRadius: size * 0.42,
        },
      ]}>
      <View style={[styles.eyesRow, { gap: size * 0.12, marginTop: size * 0.32 }]}>
        {[0, 1].map((i) => (
          <View
            key={i}
            style={{
              width: eye,
              height: eye,
              borderRadius: eye / 2,
              backgroundColor: '#fff',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <View
              style={{
                width: pupil,
                height: pupil,
                borderRadius: pupil / 2,
                backgroundColor: Palette.background,
              }}
            />
          </View>
        ))}
      </View>
      {/* petite antenne */}
      <View
        style={[
          styles.antenna,
          { top: -size * 0.12, width: size * 0.06, height: size * 0.16 },
        ]}
      />
      <View
        style={[
          styles.antennaDot,
          { top: -size * 0.18, width: size * 0.14, height: size * 0.14, borderRadius: size * 0.07 },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    backgroundColor: Palette.purple,
    alignItems: 'center',
  },
  eyesRow: { flexDirection: 'row' },
  antenna: { position: 'absolute', backgroundColor: Palette.purple },
  antennaDot: { position: 'absolute', backgroundColor: Palette.primary },
});
