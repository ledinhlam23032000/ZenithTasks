-- Older public-booking code placed the full phone in Appointment.note. Redact
-- phone-shaped digit sequences while preserving the rest of the customer's note.
UPDATE "Appointment"
SET note = regexp_replace(
  note,
  '(^|[^0-9])0[0-9](?:[ .-]?[0-9]){8,9}([^0-9]|$)',
  '\1[SĐT đã ẩn]\2',
  'g'
)
WHERE note ~ '(^|[^0-9])0[0-9](?:[ .-]?[0-9]){8,9}([^0-9]|$)';

UPDATE "Appointment"
SET note = regexp_replace(
  note,
  '(^|[^0-9])84(?:[ .-]?[0-9]){9,10}([^0-9]|$)',
  '\1[SĐT đã ẩn]\2',
  'g'
)
WHERE note ~ '(^|[^0-9])84(?:[ .-]?[0-9]){9,10}([^0-9]|$)';
