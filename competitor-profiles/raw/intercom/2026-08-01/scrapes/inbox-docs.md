# Intercom inbox evidence - 2026-08-01

Sources reviewed:

- https://www.intercom.com/help/en/articles/197-organize-team-inboxes
- https://www.intercom.com/help/en/articles/6561699-assign-conversations-to-teammates-and-teams
- https://www.intercom.com/help/en/articles/6546152-set-slas-for-conversations-and-tickets
- https://www.intercom.com/help/en/articles/8657805-team-inbox-performance-reporting

Observed product patterns:

- Team inboxes support manual, round-robin and balanced workload assignment.
- Assignment persists when a conversation is closed, preserving ownership context for future contact.
- Open, snoozed and closed states keep active queues small.
- SLA timers prioritize conversations nearing a response deadline and can respect office hours.
- Reporting measures first response, subsequent response, closing time and teammate activity.
- Internal notes and mentions support escalation without exposing the discussion to customers.

Implication for ZenithTasks: start with a simple response target and first-responder ownership, but store timestamps needed for later SLA and staff-performance reporting.
