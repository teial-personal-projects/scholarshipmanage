-- Migration 007: Collaboration Invitations
-- This migration creates the collaboration_invites table for managing email invitations
-- Uses Resend for email delivery and tracks delivery status via webhooks

-- Delivery status enum for tracking email delivery
CREATE TYPE invite_delivery_status AS ENUM (
  'pending',      -- Invite created but not sent yet
  'sent',         -- Email sent (Resend webhook: email.sent)
  'delivered',    -- Email delivered (Resend webhook: email.delivered)
  'bounced',      -- Email bounced (Resend webhook: email.bounced)
  'failed'        -- Email failed to send
);

-- Collaboration invites table
-- Stores invitation data separate from collaborations to allow multiple invites/resends
CREATE TABLE public.collaboration_invites (
  id BIGSERIAL PRIMARY KEY,
  collaboration_id BIGINT REFERENCES public.collaborations(id) ON DELETE CASCADE NOT NULL,
  user_id BIGINT REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL, -- Student who owns this collaboration
  
  -- Invitation token and expiry
  invite_token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  
  -- Email tracking
  resend_email_id TEXT,  -- Resend email ID for webhook tracking
  delivery_status invite_delivery_status DEFAULT 'pending',
  
  -- Timestamps
  sent_at TIMESTAMPTZ,           -- When email was sent
  opened_at TIMESTAMPTZ,          -- When email was opened (from webhook)
  clicked_at TIMESTAMPTZ,          -- When invite link was clicked (from webhook)
  accepted_at TIMESTAMPTZ,        -- When collaborator accepted invitation
  declined_at TIMESTAMPTZ,         -- When collaborator declined invitation
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_collaboration_invites_collaboration_id 
  ON public.collaboration_invites(collaboration_id);
CREATE INDEX idx_collaboration_invites_user_id 
  ON public.collaboration_invites(user_id);
CREATE INDEX idx_collaboration_invites_invite_token 
  ON public.collaboration_invites(invite_token);
CREATE INDEX idx_collaboration_invites_resend_email_id 
  ON public.collaboration_invites(resend_email_id) 
  WHERE resend_email_id IS NOT NULL;
CREATE INDEX idx_collaboration_invites_expires_at 
  ON public.collaboration_invites(expires_at);
CREATE INDEX idx_collaboration_invites_delivery_status 
  ON public.collaboration_invites(delivery_status);

-- Enable Row Level Security
ALTER TABLE public.collaboration_invites ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Students can view invites for their own collaborations
CREATE POLICY "Users can view invites for own collaborations" 
  ON public.collaboration_invites
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles p
      WHERE p.id = collaboration_invites.user_id
        AND p.auth_user_id = auth.uid()
    )
  );

-- RLS Policies: Students can insert invites for their own collaborations
CREATE POLICY "Users can insert invites for own collaborations" 
  ON public.collaboration_invites
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles p
      WHERE p.id = collaboration_invites.user_id
        AND p.auth_user_id = auth.uid()
    )
  );

-- RLS Policies: Students can update invites for their own collaborations
CREATE POLICY "Users can update invites for own collaborations" 
  ON public.collaboration_invites
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles p
      WHERE p.id = collaboration_invites.user_id
        AND p.auth_user_id = auth.uid()
    )
  );

-- Note: Collaborators (invite recipients) need to access invites by token
-- This is handled via a separate endpoint that doesn't use RLS
-- The endpoint validates the token and checks expiry before returning data

-- Trigger to automatically update updated_at timestamp
CREATE TRIGGER update_collaboration_invites_updated_at
  BEFORE UPDATE ON public.collaboration_invites
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE public.collaboration_invites IS 'Stores email invitations for collaborations. Separate table allows multiple invites/resends per collaboration.';
COMMENT ON COLUMN public.collaboration_invites.user_id IS 'The student who owns this collaboration invitation. Stored for easier querying and RLS policies.';
COMMENT ON COLUMN public.collaboration_invites.invite_token IS 'Secure random token used in invite link. Expires after 7 days.';
COMMENT ON COLUMN public.collaboration_invites.resend_email_id IS 'Resend email ID for tracking delivery status via webhooks.';
COMMENT ON COLUMN public.collaboration_invites.delivery_status IS 'Email delivery status updated via Resend webhooks.';
COMMENT ON COLUMN public.collaboration_invites.expires_at IS 'Token expiry timestamp (typically 7 days from creation).';
COMMENT ON COLUMN public.collaboration_invites.sent_at IS 'Timestamp when invitation email was sent via Resend.';
COMMENT ON COLUMN public.collaboration_invites.opened_at IS 'Timestamp when email was opened (from Resend webhook).';
COMMENT ON COLUMN public.collaboration_invites.clicked_at IS 'Timestamp when invite link was clicked (from Resend webhook).';

