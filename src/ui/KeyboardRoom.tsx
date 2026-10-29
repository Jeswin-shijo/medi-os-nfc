import { useRef, useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, View, type StyleProp, type ViewStyle } from 'react-native';

/**
 * Makes room for the on-screen keyboard under a form (pair it with a scroll view using useKeyboardReveal).
 * The kiosk is immersive, so Android lays the keyboard over the window instead of resizing it; a
 * KeyboardAvoidingView pads by the overlap, but it compares its own parent-relative frame with the
 * keyboard's screen position. Under the kiosk's header that undercounts by the header's height, so this
 * passes the box's real top in the window as the offset.
 */
export function KeyboardRoom({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const box = useRef<View>(null);
  const [top, setTop] = useState(0);
  return (
    <View ref={box} style={style} onLayout={() => box.current?.measureInWindow((_x, y) => setTop(Math.round(y)))}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" keyboardVerticalOffset={top}>
        {children}
      </KeyboardAvoidingView>
    </View>
  );
}
