import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Search, MessageCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSearchUsers } from '@/hooks/useUserRuns';
import { 
  useThreads, 
  useGetOrCreateThread, 
  useThreadMessages, 
  useSendMessage,
  useMessageSubscription,
  useMarkThreadAsRead,
  DmThread 
} from '@/hooks/useMessages';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';

export default function MessagesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedThread, setSelectedThread] = useState<DmThread | null>(null);
  const [messageInput, setMessageInput] = useState('');
  
  const { data: threads = [], isLoading: threadsLoading } = useThreads();
  const { data: searchResults = [] } = useSearchUsers(searchQuery);
  const getOrCreateThread = useGetOrCreateThread();
  const { data: messages = [] } = useThreadMessages(selectedThread?.id || null);
  const sendMessage = useSendMessage();
  const markAsRead = useMarkThreadAsRead();
  
  // Subscribe to realtime updates
  useMessageSubscription(selectedThread?.id || null);
  
  // Redirect to profile if not logged in
  useEffect(() => {
    if (!user) {
      navigate('/profile?msg=messages');
    }
  }, [user, navigate]);
  
  // Mark thread as read when opened
  useEffect(() => {
    if (selectedThread && selectedThread.hasUnread) {
      markAsRead.mutate(selectedThread);
    }
  }, [selectedThread?.id]);
  
  if (!user) {
    return null;
  }
  
  const handleSelectUser = async (userId: string, username: string) => {
    try {
      const thread = await getOrCreateThread.mutateAsync(userId);
      setSelectedThread({
        ...thread,
        other_username: username,
      } as DmThread);
      setSearchQuery('');
    } catch (error) {
      console.error('Failed to create thread:', error);
    }
  };
  
  const handleSelectThread = (thread: DmThread) => {
    setSelectedThread(thread);
    setSearchQuery('');
  };
  
  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedThread) return;
    
    try {
      await sendMessage.mutateAsync({
        threadId: selectedThread.id,
        body: messageInput,
      });
      setMessageInput('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  // Chat view
  if (selectedThread) {
    return (
      <div className="flex flex-col h-[calc(100vh-80px)]">
        {/* Chat header */}
        <div className="flex items-center gap-3 p-4 border-b border-border">
          <button 
            onClick={() => setSelectedThread(null)}
            className="p-2 -ml-2 hover:bg-muted rounded-full"
          >
            <ArrowLeft size={24} />
          </button>
          <span className="font-semibold text-lg">{selectedThread.other_username}</span>
        </div>
        
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No messages yet. Say hi!
            </p>
          ) : (
            messages.map((msg) => {
              const isMe = msg.sender_id === user.id;
              return (
                <div
                  key={msg.id}
                  className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[75%] px-4 py-2 rounded-2xl ${
                      isMe 
                        ? 'bg-foreground text-background rounded-br-sm' 
                        : 'bg-muted text-foreground rounded-bl-sm'
                    }`}
                  >
                    <p className="text-sm break-words">{msg.body}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
        
        {/* Input */}
        <div className="p-4 border-t border-border">
          <div className="flex gap-2">
            <Input
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message..."
              className="flex-1"
            />
            <Button 
              onClick={handleSendMessage}
              disabled={!messageInput.trim() || sendMessage.isPending}
              size="icon"
            >
              <Send size={20} />
            </Button>
          </div>
        </div>
      </div>
    );
  }
  
  // Inbox view
  return (
    <div className="flex flex-col h-[calc(100vh-80px)]">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h1 className="text-2xl font-bold mb-4">Messages</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search users"
            className="pl-10"
          />
        </div>
      </div>
      
      {/* Search results */}
      {searchQuery.length >= 2 && searchResults.length > 0 && (
        <div className="border-b border-border">
          <p className="px-4 py-2 text-xs text-muted-foreground font-medium">USERS</p>
          {searchResults.map((result) => (
            <button
              key={result.user_id}
              onClick={() => handleSelectUser(result.user_id, result.username)}
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-muted text-left"
            >
              <div className="w-10 h-10 rounded-full bg-foreground text-background flex items-center justify-center font-semibold">
                {result.username.charAt(0).toUpperCase()}
              </div>
              <span className="font-medium">{result.username}</span>
            </button>
          ))}
        </div>
      )}
      
      {/* Threads list */}
      <div className="flex-1 overflow-y-auto">
        {threadsLoading ? (
          <p className="text-center text-muted-foreground py-8">Loading...</p>
        ) : threads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <MessageCircle size={48} className="mb-4" />
            <p>No messages yet</p>
            <p className="text-sm">Search for users to start a conversation</p>
          </div>
        ) : (
          threads.map((thread) => (
            <button
              key={thread.id}
              onClick={() => handleSelectThread(thread)}
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-muted text-left border-b border-border"
            >
              <div className="relative">
                <div className="w-12 h-12 rounded-full bg-foreground text-background flex items-center justify-center font-semibold text-lg">
                  {thread.other_username?.charAt(0).toUpperCase() || '?'}
                </div>
                {thread.hasUnread && (
                  <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-red-500 rounded-full border-2 border-background" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline">
                  <span className={`${thread.hasUnread ? 'font-bold' : 'font-semibold'}`}>
                    {thread.other_username}
                  </span>
                  {thread.last_message_at && (
                    <span className={`text-xs ${thread.hasUnread ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}>
                      {formatDistanceToNow(new Date(thread.last_message_at), { addSuffix: false })}
                    </span>
                  )}
                </div>
                {thread.last_message_text && (
                  <p className={`text-sm truncate ${thread.hasUnread ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                    {thread.last_message_text}
                  </p>
                )}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
