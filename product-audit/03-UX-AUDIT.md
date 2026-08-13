# UX audit

## Browser evidence

### Public booking

- Desktop form is compact, centered, and visually coherent.
- Mobile viewport tested: 390×844; no horizontal overflow observed.
- Labels observed: name, phone, service, date, time, note; quick time buttons reduce typing.
- The service selector is a very large native list with inconsistent/typo-like labels. This creates recognition and trust cost for a patient trying to choose a service.
- In the tested browser, native date/time controls displayed locale formatting inconsistent with the Vietnamese surrounding copy. This is a browser-locale observation, not yet a universal defect.
- Invalid phone submission displayed a useful validation error but cleared the name and phone values. The user must re-enter data.

### Login

The page has clear labels and a strong brand hierarchy. The 1280px in-app capture showed the right-side form visually cropped, although DOM width metrics did not show horizontal overflow. Recheck in normal Chrome before treating this as a confirmed layout defect; it is retained as a visual QA note, not a P1 issue.

### Customer portal

The local portal rendered appointment/treatment/payment/NPS content through a bearer token. It is a useful low-friction patient flow, but the token is effectively a privacy credential and needs strict issuance, revocation, access logging, and media scoping.

## Main UX improvements

1. Preserve all valid fields after server validation errors.
2. Replace the long flat service selector with search, grouped categories, and a short “popular services” set.
3. Standardize date/time locale presentation and confirm the effective appointment timezone.
4. Add explicit privacy notice/consent link next to public phone collection.
5. Create task-oriented dashboards for reception, doctor, care, and manager instead of one broad navigation mental model.
6. Add visible save/loading/success states for multi-step server actions.
7. Add a patient timeline that unifies appointment, case, payment, photo, follow-up, and care events.
8. Define empty, permission-denied, stale-data, and concurrent-edit states for every main module.
9. Test tablet width and keyboard navigation on authenticated workflows.
10. Provide new-employee onboarding with role-specific first tasks.

