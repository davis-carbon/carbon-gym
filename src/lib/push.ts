/**
 * Web Push utility — send push notifications to clients.
 *
 * Requires env vars:
 *   NEXT_PUBLIC_VAPID_PUBLIC_KEY
 *   VAPID_PRIVATE_KEY
 *
 * Generate VAPID keys once with:
 *   node -e "const wp=require('web-push'); const k=wp.generateVAPIDKeys(); console.log(JSON.stringify(k,null,2));"
 */

import webpush from "web-push";
import { db } from "@/server/db";

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails("mailto:davis@carbontc.co", VAPID_PUBLIC, VAPID_PRIVATE);
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  icon?: string;
}

/**
 * Send a push notification to all subscriptions for a given client.
 * Silently removes expired/invalid subscriptions (410/404).
 */
export async function sendPushToClient(clientId: string, payload: PushPayload): Promise<void> {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return; // push not configured

  const subs = await db.clientPushSubscription.findMany({ where: { clientId } });
  if (subs.length === 0) return;

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload),
        );
      } catch (err: any) {
        if (err?.statusCode === 410 || err?.statusCode === 404) {
          // Subscription expired — clean it up
          await db.clientPushSubscription.deleteMany({
            where: { id: sub.id },
          });
        }
      }
    }),
  );
}
