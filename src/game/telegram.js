export const tg = typeof window !== 'undefined' ? window.Telegram?.WebApp || null : null;
export const IN_TELEGRAM = !!(tg && tg.initData);

export function getInitData() {
  return tg?.initData || '';
}

export function getTelegramUser() {
  return tg?.initDataUnsafe?.user || null;
}

export function haptic(type, style) {
  if (!tg?.HapticFeedback) return;
  try {
    if (type === 'impact') tg.HapticFeedback.impactOccurred(style || 'light');
    else if (type === 'notification') tg.HapticFeedback.notificationOccurred(style || 'success');
    else if (type === 'selection') tg.HapticFeedback.selectionChanged();
  } catch {
    /* not supported on this client, ignore */
  }
}

export function initTelegramApp({ onThemeChange } = {}) {
  if (!tg) return;
  tg.ready();
  tg.expand();
  try {
    tg.enableClosingConfirmation();
  } catch {
    /* older client */
  }
  const apply = () => onThemeChange?.(tg.colorScheme === 'dark', tg.themeParams || {});
  apply();
  tg.onEvent('themeChanged', apply);
}

export function setHeaderColor(hex) {
  try {
    tg?.setHeaderColor?.(hex);
  } catch {
    /* ignore */
  }
}

export function showPopup(opts, fallbackMessage) {
  if (tg?.showPopup) {
    tg.showPopup(opts);
  } else if (fallbackMessage) {
    alert(fallbackMessage);
  }
}

export function showAlert(message) {
  if (tg?.showAlert) tg.showAlert(message);
}

export function openInvoice(url, callback) {
  if (tg?.openInvoice) tg.openInvoice(url, callback);
}
