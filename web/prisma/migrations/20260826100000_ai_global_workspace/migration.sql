-- Additive only: GLOBAL is the explicit all-project scope for Global Admin AI.
-- Existing INTERNAL and PROJECT rows remain unchanged.
ALTER TYPE "AssistantWorkspaceKind" ADD VALUE IF NOT EXISTS 'GLOBAL';
