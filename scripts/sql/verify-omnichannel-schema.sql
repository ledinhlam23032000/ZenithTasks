SELECT
  CASE WHEN to_regclass('public."ChannelAccount"') IS NULL THEN 0 ELSE 1 END
  || '|'
  || CASE WHEN to_regclass('public."Conversation_one_active_per_thread"') IS NULL THEN 0 ELSE 1 END;
