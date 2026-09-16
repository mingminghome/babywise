import type { AppState } from '../hooks/useAppState';
import { PregnancyView } from './PregnancyView';
import { BabyScreen } from './BabyScreen';

export function HomeScreen({ state }: { state: AppState }) {
  const { homeMode } = state;

  if (homeMode === 'baby') {
    return <BabyScreen state={state} isHome />;
  }

  return <PregnancyView state={state} />;
}
