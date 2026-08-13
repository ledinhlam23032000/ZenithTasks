# Accessibility audit

## Observed positives

- Public booking uses visible labels for the main form fields.
- Native date/time/select controls provide baseline platform semantics.
- Public booking fit the tested 390px viewport without horizontal overflow.
- Validation text was visible after the invalid phone attempt.

## Not yet proven

- Keyboard-only navigation and focus order.
- Focus trapping and restoration in dialogs.
- Screen-reader names for icon-only controls and data tables.
- Contrast across status badges and chart colors.
- Touch target size in authenticated modules.
- Accessible announcement of server-action pending/success/error states.
- WCAG 2.2 AA compliance of the internal application.

## Action

Add axe and keyboard smoke tests to the browser suite. Treat errors as field-level accessible descriptions, preserve input values, and ensure every permission-denied state explains what the user can do next.

