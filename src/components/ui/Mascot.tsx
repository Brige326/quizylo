import { StyleSheet, View } from 'react-native';

import { Palette } from '@/constants/theme';

/**
 * Mascotte Quizylo — blob violet à deux pointes avec deux yeux, construit en
 * Views (aucun module natif). Taille paramétrable.
 */
export function Mascot({ size = 96 }: { size?: number }) {
  const peakW = size * 0.26;
  const peakH = size * 0.3;
  const eye = Math.max(7, size * 0.17);
  const pupil = eye * 0.52;

  return (
    <View style={{ width: size, height: size * 1.1, alignItems: 'center' }}>
      {/* Deux pointes (silhouette) */}
      <View style={[styles.peaksRow, { width: size * 0.72, top: 0 }]}>
        <Triangle w={peakW} h={peakH} />
        <Triangle w={peakW} h={peakH} />
      </View>

      {/* Corps */}
      <View
        style={{
          position: 'absolute',
          top: peakH * 0.55,
          width: size,
          height: size * 0.78,
          backgroundColor: Palette.purple,
          borderTopLeftRadius: size * 0.42,
          borderTopRightRadius: size * 0.42,
          borderBottomLeftRadius: size * 0.46,
          borderBottomRightRadius: size * 0.46,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <View style={[styles.eyesRow, { gap: size * 0.14, marginTop: size * 0.04 }]}>
          {[0, 1].map((i) => (
            <View
              key={i}
              style={{
                width: eye,
                height: eye * 1.15,
                borderRadius: eye,
                backgroundColor: '#fff',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <View
                style={{
                  width: pupil,
                  height: pupil,
                  borderRadius: pupil / 2,
                  backgroundColor: '#1A1030',
                }}
              />
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

function Triangle({ w, h }: { w: number; h: number }) {
  return (
    <View
      style={{
        width: 0,
        height: 0,
        borderLeftWidth: w / 2,
        borderRightWidth: w / 2,
        borderBottomWidth: h,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderBottomColor: Palette.purple,
      }}
    />
  );
}

const styles = StyleSheet.create({
  peaksRow: {
    position: 'absolute',
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 1,
  },
  eyesRow: { flexDirection: 'row' },
});
