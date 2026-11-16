// Modale de dessin à main levée : canvas dans une WebView (fonctionne en Expo Go).
// À l'insertion, le canvas est exporté en PNG (data URI) renvoyé via onMessage.
import { useRef, useState, type ComponentType } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

// Contournement typage ref WebView sous React 19 (runtime inchangé).
const WV = WebView as unknown as ComponentType<any>;

import { Text } from '@/components/ui/Text';
import { Palette, Radius, Spacing } from '@/constants/theme';
import { drawingHtml } from '@/lib/drawingHtml';

type Props = {
  visible: boolean;
  onCancel: () => void;
  onInsert: (dataUri: string) => void;
};

const PEN_COLORS = ['#E8ECE9', '#22E07B', '#5B8CFF', '#FF4D8D', '#F5B301'];
const PEN_WIDTHS: { label: string; value: number }[] = [
  { label: 'Fin', value: 2.5 },
  { label: 'Moyen', value: 5 },
  { label: 'Épais', value: 9 },
];
const ERASER_COLOR = '#101712';

export function DrawingModal({ visible, onCancel, onInsert }: Props) {
  const webRef = useRef<WebView>(null);
  const insets = useSafeAreaInsets();
  const [color, setColor] = useState(PEN_COLORS[0]);
  const [width, setWidth] = useState(PEN_WIDTHS[0].value);
  const [eraser, setEraser] = useState(false);

  const inject = (js: string) => webRef.current?.injectJavaScript(`${js} true;`);

  const pickColor = (c: string) => {
    setColor(c);
    setEraser(false);
    inject(`window.__setColor(${JSON.stringify(c)});`);
  };
  const pickWidth = (w: number) => {
    setWidth(w);
    inject(`window.__setWidth(${w});`);
  };
  const toggleEraser = () => {
    const on = !eraser;
    setEraser(on);
    inject(`window.__setColor(${JSON.stringify(on ? ERASER_COLOR : color)}); window.__setWidth(${on ? 18 : width});`);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onCancel}>
      <View style={[styles.root, { paddingTop: insets.top + Spacing.xs }]}>
        <View style={styles.header}>
          <Pressable onPress={onCancel} hitSlop={10}>
            <Text variant="bodyStrong" color={Palette.textSecondary}>
              Annuler
            </Text>
          </Pressable>
          <Text variant="heading">Croquis</Text>
          <Pressable
            onPress={() => webRef.current?.injectJavaScript('window.__export(); true;')}
            hitSlop={10}>
            <Text variant="bodyStrong" color={Palette.primary}>
              Insérer
            </Text>
          </Pressable>
        </View>

        <View style={styles.canvasWrap}>
          <WV
            ref={webRef}
            originWhitelist={['*']}
            source={{ html: drawingHtml }}
            style={styles.web}
            scrollEnabled={false}
            onMessage={(e: WebViewMessageEvent) => {
              const d = e.nativeEvent.data;
              if (d && d.startsWith('data:image')) onInsert(d);
            }}
          />
        </View>

        {/* Barre d'outils : couleurs, épaisseur, gomme */}
        <View style={styles.tools}>
          <View style={styles.toolRow}>
            {PEN_COLORS.map((c) => (
              <Pressable
                key={c}
                onPress={() => pickColor(c)}
                style={[
                  styles.swatch,
                  { backgroundColor: c },
                  !eraser && color === c && styles.swatchActive,
                ]}
                accessibilityLabel={`Couleur ${c}`}
              />
            ))}
            <Pressable
              onPress={toggleEraser}
              style={[styles.eraser, eraser && styles.eraserActive]}
              accessibilityLabel="Gomme">
              <Text variant="small" color={eraser ? Palette.onPrimary : Palette.text}>
                Gomme
              </Text>
            </Pressable>
          </View>
          <View style={styles.toolRow}>
            {PEN_WIDTHS.map((w) => (
              <Pressable
                key={w.value}
                onPress={() => pickWidth(w.value)}
                style={[styles.widthBtn, !eraser && width === w.value && styles.widthBtnActive]}>
                <Text
                  variant="small"
                  color={!eraser && width === w.value ? Palette.onPrimary : Palette.text}>
                  {w.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <Pressable
          onPress={() => webRef.current?.injectJavaScript('window.__clear(); true;')}
          style={[styles.clearBtn, { marginBottom: insets.bottom + Spacing.md }]}>
          <Text variant="bodyStrong" color={Palette.text}>
            Tout effacer
          </Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Palette.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  canvasWrap: { flex: 1, marginHorizontal: Spacing.md, borderRadius: Radius.lg, overflow: 'hidden' },
  web: { flex: 1, backgroundColor: '#101712' },
  clearBtn: {
    alignSelf: 'center',
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: Palette.surface,
  },
  tools: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, gap: Spacing.sm },
  toolRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  swatch: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  swatchActive: { borderColor: '#FFFFFF' },
  eraser: {
    paddingHorizontal: Spacing.md,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.surface,
  },
  eraserActive: { backgroundColor: Palette.primary },
  widthBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.md,
    backgroundColor: Palette.surface,
  },
  widthBtnActive: { backgroundColor: Palette.primary },
});
