export type NotificationAccountType = 'business' | 'store';

export const notificationReadStorageKey = (accountType: NotificationAccountType) =>
  `vex-${accountType}-notification-read`;

const notificationReadStateEvent = 'vex-notification-read-state-change';

export const getReadNotificationIds = (accountType: NotificationAccountType) => {
  try {
    const saved = window.localStorage.getItem(notificationReadStorageKey(accountType));
    return new Set<string>(saved ? JSON.parse(saved) : []);
  } catch {
    return new Set<string>();
  }
};

export const saveReadNotificationIds = (accountType: NotificationAccountType, ids: Set<string>) => {
  const key = notificationReadStorageKey(accountType);
  const serializedIds = JSON.stringify([...ids]);
  if (window.localStorage.getItem(key) === serializedIds) return;

  window.localStorage.setItem(key, serializedIds);
  window.dispatchEvent(new Event(notificationReadStateEvent));
};

export const getNotificationReadStateEvent = () => notificationReadStateEvent;