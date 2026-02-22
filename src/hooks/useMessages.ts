import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

export interface DmThread {
  id: string;
  user1_id: string;
  user2_id: string;
  created_at: string;
  last_message_text: string | null;
  last_message_at: string | null;
  last_message_sender_id: string | null;
  user1_last_read_at: string | null;
  user2_last_read_at: string | null;
  other_username?: string;
  hasUnread?: boolean;
}

export interface DmMessage {
  id: string;
  thread_id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

// Helper to check if thread has unread messages for current user
function computeHasUnread(thread: DmThread, userId: string): boolean {
  if (!thread.last_message_at || !thread.last_message_sender_id) return false;
  
  // If I sent the last message, no unread
  if (thread.last_message_sender_id === userId) return false;
  
  // Get my last read timestamp
  const myLastRead = thread.user1_id === userId 
    ? thread.user1_last_read_at 
    : thread.user2_last_read_at;
  
  // If never read, and there's a message from other person, it's unread
  if (!myLastRead) return true;
  
  // Compare timestamps
  return new Date(thread.last_message_at) > new Date(myLastRead);
}

// Get all threads for current user
export function useThreads() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['dm_threads', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data: threads, error } = await supabase
        .from('dm_threads')
        .select('*')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .order('last_message_at', { ascending: false });
      
      if (error) throw error;
      
      // Get usernames for the other users
      const otherUserIds = threads.map(t => 
        t.user1_id === user.id ? t.user2_id : t.user1_id
      );
      
      if (otherUserIds.length === 0) return [];
      
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username')
        .in('user_id', otherUserIds);
      
      const usernameMap = new Map(profiles?.map(p => [p.user_id, p.username]) || []);
      
      return threads.map(t => ({
        ...t,
        other_username: usernameMap.get(t.user1_id === user.id ? t.user2_id : t.user1_id) || 'Unknown',
        hasUnread: computeHasUnread(t as DmThread, user.id),
      })) as DmThread[];
    },
    enabled: !!user,
  });
}

// Get unread count for badge
export function useUnreadCount() {
  const { data: threads = [] } = useThreads();
  return threads.filter(t => t.hasUnread).length;
}

// Get or create a thread with another user
export function useGetOrCreateThread() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (otherUserId: string) => {
      if (!user) throw new Error('Not authenticated');
      
      // Canonical ordering: smaller UUID first
      const [user1, user2] = [user.id, otherUserId].sort();
      
      // Check if thread exists
      const { data: existing } = await supabase
        .from('dm_threads')
        .select('*')
        .eq('user1_id', user1)
        .eq('user2_id', user2)
        .maybeSingle();
      
      if (existing) return existing;
      
      // Create new thread
      const { data: newThread, error } = await supabase
        .from('dm_threads')
        .insert({ user1_id: user1, user2_id: user2 })
        .select()
        .single();
      
      if (error) throw error;
      return newThread;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dm_threads'] });
    },
  });
}

// Get messages for a thread
export function useThreadMessages(threadId: string | null) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['dm_messages', threadId],
    queryFn: async () => {
      if (!threadId) return [];
      
      const { data, error } = await supabase
        .from('dm_messages')
        .select('*')
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data as DmMessage[];
    },
    enabled: !!threadId && !!user,
  });
}

// Send a message
export function useSendMessage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ threadId, body }: { threadId: string; body: string }) => {
      if (!user) throw new Error('Not authenticated');
      
      // Insert message
      const { data: message, error: msgError } = await supabase
        .from('dm_messages')
        .insert({
          thread_id: threadId,
          sender_id: user.id,
          body: body.trim(),
        })
        .select()
        .single();
      
      if (msgError) throw msgError;
      
      const now = new Date().toISOString();
      
      // Update thread's last message and sender
      const { error: threadError } = await supabase
        .from('dm_threads')
        .update({
          last_message_text: body.trim().substring(0, 100),
          last_message_at: now,
          last_message_sender_id: user.id,
        })
        .eq('id', threadId);
      
      if (threadError) throw threadError;
      
      return message;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['dm_messages', variables.threadId] });
      queryClient.invalidateQueries({ queryKey: ['dm_threads'] });
    },
  });
}

// Mark thread as read
export function useMarkThreadAsRead() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (thread: DmThread) => {
      if (!user) throw new Error('Not authenticated');
      
      const now = new Date().toISOString();
      const updateField = thread.user1_id === user.id 
        ? { user1_last_read_at: now }
        : { user2_last_read_at: now };
      
      const { error } = await supabase
        .from('dm_threads')
        .update(updateField)
        .eq('id', thread.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dm_threads'] });
    },
  });
}

// Subscribe to new messages for a thread (realtime)
export function useMessageSubscription(threadId: string | null) {
  const queryClient = useQueryClient();
  
  useEffect(() => {
    if (!threadId) return;
    
    const channel = supabase
      .channel(`dm_messages_${threadId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'dm_messages',
          filter: `thread_id=eq.${threadId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['dm_messages', threadId] });
          queryClient.invalidateQueries({ queryKey: ['dm_threads'] });
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [threadId, queryClient]);
}

// Subscribe to thread updates for unread badge
export function useThreadsSubscription() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  useEffect(() => {
    if (!user) return;
    
    const channel = supabase
      .channel('dm_threads_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'dm_threads',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['dm_threads'] });
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);
}
