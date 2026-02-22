
-- Create dm_threads table for 1:1 conversations
-- Using canonical ordering: user1_id < user2_id to ensure uniqueness
CREATE TABLE public.dm_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id uuid NOT NULL,
  user2_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_message_text text,
  last_message_at timestamptz DEFAULT now(),
  CONSTRAINT dm_threads_user1_fkey FOREIGN KEY (user1_id) REFERENCES profiles(user_id) ON DELETE CASCADE,
  CONSTRAINT dm_threads_user2_fkey FOREIGN KEY (user2_id) REFERENCES profiles(user_id) ON DELETE CASCADE,
  CONSTRAINT dm_threads_different_users CHECK (user1_id != user2_id),
  CONSTRAINT dm_threads_canonical_order CHECK (user1_id < user2_id),
  CONSTRAINT dm_threads_unique_pair UNIQUE (user1_id, user2_id)
);

-- Indexes for dm_threads
CREATE INDEX idx_dm_threads_user1 ON public.dm_threads(user1_id);
CREATE INDEX idx_dm_threads_user2 ON public.dm_threads(user2_id);
CREATE INDEX idx_dm_threads_last_message ON public.dm_threads(last_message_at DESC);

-- Enable RLS
ALTER TABLE public.dm_threads ENABLE ROW LEVEL SECURITY;

-- RLS policies for dm_threads
CREATE POLICY "Users can view their own threads"
ON public.dm_threads FOR SELECT
USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Users can create threads they belong to"
ON public.dm_threads FOR INSERT
WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Users can update their own threads"
ON public.dm_threads FOR UPDATE
USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Create dm_messages table
CREATE TABLE public.dm_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.dm_threads(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT dm_messages_sender_fkey FOREIGN KEY (sender_id) REFERENCES profiles(user_id) ON DELETE CASCADE
);

-- Index for dm_messages
CREATE INDEX idx_dm_messages_thread_created ON public.dm_messages(thread_id, created_at);

-- Enable RLS
ALTER TABLE public.dm_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for dm_messages
CREATE POLICY "Users can view messages in their threads"
ON public.dm_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.dm_threads
    WHERE id = dm_messages.thread_id
    AND (user1_id = auth.uid() OR user2_id = auth.uid())
  )
);

CREATE POLICY "Users can send messages to their threads"
ON public.dm_messages FOR INSERT
WITH CHECK (
  auth.uid() = sender_id
  AND EXISTS (
    SELECT 1 FROM public.dm_threads
    WHERE id = dm_messages.thread_id
    AND (user1_id = auth.uid() OR user2_id = auth.uid())
  )
);

-- Enable realtime for dm_messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.dm_messages;
