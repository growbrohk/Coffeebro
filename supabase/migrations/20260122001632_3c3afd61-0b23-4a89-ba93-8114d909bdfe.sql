-- Add unread tracking columns to dm_threads
ALTER TABLE public.dm_threads 
ADD COLUMN user1_last_read_at timestamptz DEFAULT now(),
ADD COLUMN user2_last_read_at timestamptz DEFAULT now(),
ADD COLUMN last_message_sender_id uuid NULL;

-- Create indexes for efficient unread queries
CREATE INDEX idx_dm_threads_last_read ON public.dm_threads (user1_last_read_at, user2_last_read_at);

-- Update the existing UPDATE policy to be more specific about what can be updated
DROP POLICY IF EXISTS "Users can update their own threads" ON public.dm_threads;

-- Policy for updating last_message fields (when sending a message)
CREATE POLICY "Users can update thread last message" 
ON public.dm_threads 
FOR UPDATE 
USING ((auth.uid() = user1_id) OR (auth.uid() = user2_id));

-- Note: The RLS policy allows updates, but the frontend will only update appropriate fields