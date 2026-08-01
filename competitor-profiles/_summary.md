# Omnichannel inbox research summary for ZenithTasks

**Generated:** 2026-08-01
**Scope:** New inbound and outbound Facebook Fanpage Messenger plus Zalo OA messages, handled inside ZenithTasks.

## Cross-product conclusion

The strongest products converge on the same architecture: connect each provider independently, normalize provider identities into channel contacts, create a conversation on the first inbound message, place it in an unassigned queue, assign one accountable owner, and link the channel contact to the CRM record only when reliable identifying information is available.

## Patterns to adopt

1. A dedicated `ChannelAccount` layer for Zalo OA and Facebook Page credentials and health.
2. `ChannelContact` records keyed by provider user ID, optionally linked to an existing `Customer`.
3. One `Conversation` per channel contact and channel account, with open, snoozed and closed states.
4. Durable `Message` records with provider message ID, direction, content type, delivery state and raw-event reference.
5. Unassigned, mine and all inboxes; first agent to reply claims an unassigned conversation.
6. Internal notes, tags, assignment events and an immutable audit trail.
7. Presence/typing indicators and optimistic-version checks to prevent duplicate replies.
8. Connection-health checks, webhook verification, deduplication and a visible reauthorization action.
9. Customer context panel with an explicit link/create flow; never guess identity from display name.
10. Response-time metrics and an overdue badge, while deferring a full workflow builder.

## Patterns to defer

- Broadcast campaigns, marketing automation and AI auto-replies.
- Complex round-robin/balanced workload engines.
- Historical message import.
- Voice calls and a full ticketing system.

## Recommended product position

Build the inbox natively inside ZenithTasks using official Zalo OA and Meta APIs. Use a provider-adapter boundary so later channels can be added without changing the inbox domain model. This avoids duplicate CRM ownership and keeps clinic customer context, permissions and audit records inside the existing system.
