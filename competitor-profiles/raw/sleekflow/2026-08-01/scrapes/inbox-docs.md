# SleekFlow inbox evidence - 2026-08-01

Sources reviewed:

- https://help.sleekflow.io/en_US/getting-started/welcome-to-sleekflow
- https://help.sleekflow.io/en_US/getting-started-with-sleekflow-inbox
- https://help.sleekflow.io/en_US/assigning-and-collaborating-on-conversations
- https://help.sleekflow.io/en_US/roles-and-permissions-

Observed product patterns:

- The product separates Channels, Inbox, Contacts, automations and analytics.
- Each conversation belongs to one contact and one channel.
- Inbox rows show last-message preview, timestamp, tags and quick actions.
- Conversation ownership can be a person or team. A team queue may be claimed by the first responder or assigned round-robin.
- Collaborators and internal notes allow consultation without changing the primary owner.
- Permissions separately control viewing, replying, assigning and channel administration.

Implication for ZenithTasks: keep one accountable owner per conversation, allow internal notes, and separate channel-configuration permissions from everyday reply permissions.
