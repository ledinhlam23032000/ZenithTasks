import type { ChannelProviderAdapter, ChannelProviderName } from "./types";

export function channelProviderAdapter(
  provider: ChannelProviderName,
  adapters: Record<ChannelProviderName, ChannelProviderAdapter>,
): ChannelProviderAdapter {
  return adapters[provider];
}
