// No react-native imports: tested in plain Node.
import { normalizeRoute } from './steps';

/** Screens whose own on-screen Back button just goes one step back; the Android Back button does the same there. */
const BACK_ROUTES: readonly string[] = ['/department', '/doctor', '/payment', '/staff/link-card', '/staff/printer', '/staff/setup'];

/** What the Android Back button does on a route: 'back' like the screen's own Back, or 'none' (Welcome and every screen without a Back button of its own). */
export function hardwareBackAction(route: string): 'back' | 'none' {
  return BACK_ROUTES.includes(normalizeRoute(route)) ? 'back' : 'none';
}
