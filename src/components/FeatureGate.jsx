import { useFeatureFlag } from '../hooks/useFeatureFlag';

export default function FeatureGate({ flag, children, fallback = null }) {
  const enabled = useFeatureFlag(flag);
  return enabled ? children : fallback;
}
