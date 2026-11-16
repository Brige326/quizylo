// Modale de dessin à main levée : canvas dans une WebView (fonctionne en Expo Go).
// À l'insertion, le canvas est exporté en PNG (data URI) renvoyé via onMessage.
import { useRef, type ComponentType } from 'react';
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

export function DrawingModal({ visible, onCancel, onInsert }: Props) {
  const webRef = useRef<WebView>(null);
  const insets = useSafeAreaInsets();

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

        <Pressable
          onPress={() => webRef.current?.injectJavaScript('window.__clear(); true;')}
          style={[styles.clearBtn, { marginBottom: insets.bottom + Spacing.md }]}>
          <Text variant="bodyStrong" color={Palette.text}>
            Effacer
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
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: Palette.surface,
  },
});
