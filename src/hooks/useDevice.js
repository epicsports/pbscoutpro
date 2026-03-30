import { useState, useEffect } from 'react';

// ─── Device detection ───
// Breakpoints (px):
//   mobile:  < 640
//   tablet:  640–1023
//   desktop: ≥ 1024

const getDevice = () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const isTouchDevice = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const isAndroid = /Android/.test(navigator.userAgent);
  const isMobileUA = isIOS || isAndroid || /Mobile/.test(navigator.userAgent);

  let type;
  if (w < 640) type = 'mobile';
  else if (w < 1024) type = 'tablet';
  else type = 'desktop';

  // iPad in landscape can be wide — force tablet
  if (isTouchDevice && w >= 640 && w < 1200) type = 'tablet';

  return {
    type,                          // 'mobile' | 'tablet' | 'desktop'
    isMobile: type === 'mobile',
    isTablet: type === 'tablet',
    isDesktop: type === 'desktop',
    isTouch: isTouchDevice,
    isIOS,
    isAndroid,
    isMobileUA,
    width: w,
    height: h,
    isLandscape: w > h,
    isPortrait: w <= h,
    // Safe area support (iPhone notch / home indicator)
    hasSafeArea: isIOS,
  };
};

export function useDevice() {
  const [device, setDevice] = useState(getDevice);

  useEffect(() => {
    const handler = () => setDevice(getDevice());
    window.addEventListener('resize', handler);
    window.addEventListener('orientationchange', handler);
    return () => {
      window.removeEventListener('resize', handler);
      window.removeEventListener('orientationchange', handler);
    };
  }, []);

  return device;
}
