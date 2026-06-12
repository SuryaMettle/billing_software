import { io } from "socket.io-client";
import { API_BASE_URL } from "./api.js";

let socket;

export function getSocket() {
  if (!socket) {
    socket = io(API_BASE_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000
    });
  }

  return socket;
}

export function subscribeToRealtimeEvents(handlers = {}) {
  const activeSocket = getSocket();
  const subscriptions = [
    ["invoice-created", handlers.onInvoiceChanged],
    ["invoice-updated", handlers.onInvoiceChanged],
    ["purchase-invoice-updated", handlers.onPurchaseChanged],
    ["product-updated", handlers.onInventoryChanged],
    ["stock-updated", handlers.onInventoryChanged],
    ["customer-updated", handlers.onCustomerChanged],
    ["offers-updated", handlers.onOffersChanged],
    ["settings-updated", handlers.onSettingsChanged]
  ];

  subscriptions.forEach(([event, handler]) => {
    if (handler) activeSocket.on(event, handler);
  });

  return () => {
    subscriptions.forEach(([event, handler]) => {
      if (handler) activeSocket.off(event, handler);
    });
  };
}
