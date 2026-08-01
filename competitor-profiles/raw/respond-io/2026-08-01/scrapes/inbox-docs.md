# respond.io inbox evidence - 2026-08-01

Sources reviewed:

- https://respond.io/help/inbox/getting-started-with-inbox
- https://respond.io/help/inbox/collaborating-with-your-team-in-inbox
- https://respond.io/help/inbox/managing-conversations-in-inbox
- https://respond.io/help/contacts/contacts-overview
- https://respond.io/help/facebook-messenger/facebook-messenger-quick-start

Observed product patterns:

- New inbound senders become Contacts; new conversations enter an unassigned queue.
- The first agent reply can claim ownership automatically, while explicit assignment and team inboxes remain available.
- Conversations have open, snoozed and closed states; internal comments and assignment events appear in the history.
- Agents see when another agent is typing, reducing duplicate replies.
- Outgoing messages expose sent, delivered, read and failed states when supported by the channel.
- A contact can have multiple channel identities. Duplicate contacts can be merged while preserving messages, events and comments.
- Facebook permissions can become stale. The product exposes a troubleshooting and permission-refresh action rather than failing silently.

Implication for ZenithTasks: use platform identity as the initial key, keep customer linking nullable, record delivery state, and expose connection health and reauthorization.
