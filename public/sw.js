/* Service worker de Trackz — volontairement minimal : il ne sert qu'a
   recevoir les notifications push et a rendre l'app installable.
   Pas de cache : mieux vaut un ecran vide hors-ligne qu'un tableau de
   bord perime qui te ferait croire qu'une case est cochee. */

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

// Un handler `fetch`, meme passe-plat, reste requis par certains
// navigateurs pour considerer l'app installable.
self.addEventListener("fetch", () => {});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Trackz", body: event.data ? event.data.text() : "" };
  }

  event.waitUntil(
    self.registration.showNotification(data.title || "Trackz", {
      body: data.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: data.tag || "trackz",
      renotify: false,
      vibrate: [80, 40, 80],
      data: { url: data.url || "/tracker" },
      actions: [{ action: "open", title: "Ouvrir ma journee" }],
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/tracker";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ("focus" in client) {
            if ("navigate" in client) client.navigate(target);
            return client.focus();
          }
        }
        return self.clients.openWindow(target);
      }),
  );
});
