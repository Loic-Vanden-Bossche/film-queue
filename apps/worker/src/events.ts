import { EVENTS_CHANNEL } from "./config";
import { publisher } from "./redis";

export async function publishEvent(payload: Record<string, unknown>) {
  await publisher.publish(EVENTS_CHANNEL, JSON.stringify(payload));
}
