import Svg, { Path } from 'react-native-svg';

import { markForWidth } from '../theme/brandLogo';
import { colors } from '../theme/tokens';

/**
 * The MediOS Reception mark (the MediOS cross with contactless waves), drawn from the same
 * geometry as the launcher icon. Give the mark's width; the height follows. Under 32 dp it
 * switches to the heavier two-wave drawing by itself. Decorative: label the parent instead.
 */
export function BrandMark({ width, color = colors.primary }: { width: number; color?: string }) {
  const g = markForWidth(width);
  return (
    <Svg
      width={width}
      height={(width * g.height) / g.width}
      viewBox={g.viewBox}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      <Path d={g.cross} fill={color} />
      {g.waves.map((d) => (
        <Path key={d} d={d} fill="none" stroke={color} strokeWidth={g.waveWidth} strokeLinecap="round" />
      ))}
    </Svg>
  );
}
