# Pancake product evidence - 2026-08-01

Sources reviewed:

- https://docs.pancake.biz/pancake/intro
- https://docs.pancake.biz/pancake/st-f1/st-p6
- https://docs.pancake.biz/pancake/st-f2/st-p1?lang=vi
- https://docs.pancake.biz/pancake/st-f7/st-p5?lang=vi

Observed product patterns:

- One product surface manages messages and comments across Facebook, Zalo, Instagram and other channels.
- Channels are connected separately, then shown in a combined operating interface.
- Conversation management is built around filters, search, tags, advanced actions and error guidance.
- The administration area includes permissions, synchronization, round-robin handling, saved replies, AI assistance and staff analytics.
- CRM is a separate customer-information layer beside the conversation layer.

Implication for ZenithTasks: channel identities and conversations should not be stored directly in the existing `CareMessage` log. They need a dedicated inbox layer that can later link to the clinic customer record.
