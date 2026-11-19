// Loaded into the service worker: tapping a reminder opens the app on that project.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const hash = (event.notification.data && event.notification.data.hash) || '#/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      const scope = self.registration.scope;
      for (const c of list) {
        if (c.url.startsWith(scope) && 'focus' in c) {
          c.navigate(scope + hash).catch(() => {});
          return c.focus();
        }
      }
      return self.clients.openWindow(scope + hash);
    }),
  );
});
