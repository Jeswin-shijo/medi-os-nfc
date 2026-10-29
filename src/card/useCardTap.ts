import { useIsFocused } from 'expo-router';
import { createElement, useCallback, useEffect, useState, type ReactElement } from 'react';
import { markActive } from '../flow/useInactivity';
import NfcProxy from '../nfc/NfcProxy';
import { RepeatGuard, tagIdToCardId } from './cardId';
import { UsbReaderInput } from './UsbReaderInput';

/** The same card again within this long is the same tap (held on the reader, or read twice). */
const REPEAT_MS = 2000;

/**
 * Listens for patient cards on the built-in NFC reader (when the tablet has one and it is on)
 * and on a USB reader, and hands each card id to `onCard`, once per tap. Listens only while
 * `enabled` and the screen is the one in front, so a screen further down the stack never takes
 * a card. Returns the hidden field the USB reader types into: render it once in the screen.
 * Pass a memoised `onCard` (useCallback): a new one restarts the listening.
 */
export function useCardTap(onCard: (cardId: string) => void, enabled: boolean): ReactElement | null {
  const focused = useIsFocused();
  const listening = enabled && focused;
  const [guard] = useState(() => new RepeatGuard(REPEAT_MS));

  const deliver = useCallback(
    (cardId: string) => {
      if (!guard.accept(cardId, Date.now())) return;
      markActive();
      onCard(cardId);
    },
    [guard, onCard],
  );

  useEffect(() => {
    if (!listening) return;
    return NfcProxy.onTag((tag) => {
      const cardId = tagIdToCardId(tag.id);
      if (cardId) deliver(cardId);
    });
  }, [listening, deliver]);

  return listening ? createElement(UsbReaderInput, { onCard: deliver }) : null;
}
