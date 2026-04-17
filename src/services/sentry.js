import * as Sentry from '@sentry/react';

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;

export function initSentry() {
  if (!SENTRY_DSN || SENTRY_DSN === '__SENTRY_DSN_TBD__') {
    if (import.meta.env.PROD) {
      console.warn('[Sentry] DSN not configured — error tracking disabled');
    }
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: import.meta.env.MODE,
    enabled: import.meta.env.PROD,
    tracesSampleRate: 0.1,
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'Non-Error promise rejection captured',
      'NetworkError',
      'Failed to fetch',
    ],
    beforeSend(event) {
      if (!navigator.onLine) return null;
      return event;
    },
  });
}

export function setSentryUser({ uid, email, workspace, role }) {
  if (!SENTRY_DSN || SENTRY_DSN === '__SENTRY_DSN_TBD__') return;
  Sentry.setUser({ id: uid, email, username: workspace });
  Sentry.setTag('workspace', workspace);
  Sentry.setTag('role', role);
}

export function clearSentryUser() {
  if (!SENTRY_DSN || SENTRY_DSN === '__SENTRY_DSN_TBD__') return;
  Sentry.setUser(null);
}

export function captureMessage(message, level = 'info', context = {}) {
  if (!SENTRY_DSN || SENTRY_DSN === '__SENTRY_DSN_TBD__') return;
  Sentry.captureMessage(message, { level, extra: context });
}

export function captureException(error, context = {}) {
  if (!SENTRY_DSN || SENTRY_DSN === '__SENTRY_DSN_TBD__') return;
  Sentry.captureException(error, { extra: context });
}
