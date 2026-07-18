export type RuntimePlatform = 'ios' | 'android' | 'web';

export function getRuntimePlatform(): RuntimePlatform {
  if (typeof window === 'undefined') return 'web';

  const cap = (window as any).Capacitor;
  const nativePlatform = cap?.getPlatform?.() || cap?.Platform?.toLowerCase?.();
  if (nativePlatform === 'ios' || nativePlatform === 'android') return nativePlatform;

  const ua = navigator.userAgent || '';
  if (/android/i.test(ua)) return 'android';
  if (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'ios';

  return 'web';
}

export function isNativeRuntime(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(window as any).Capacitor?.isNativePlatform?.();
}
