import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { useSearchUsers } from '@/hooks/useUserRuns';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function LeaderboardPage() {
  const navigate = useNavigate();
  const { data: leaderboard, isLoading } = useLeaderboard();
  const { profile, user } = useAuth();
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { data: searchResults = [] } = useSearchUsers(searchQuery);

  const currentMonth = new Date().toLocaleDateString('en-US', { month: 'long' });

  const handleUsernameClick = (userId: string) => {
    if (!user) {
      navigate('/profile?msg=view-calendar');
      return;
    }
    navigate(`/users/${userId}`);
  };

  const handleSearchClick = () => {
    if (!user) {
      navigate('/profile?msg=search');
      return;
    }
    setShowSearch(true);
  };

  const handleSearchResultClick = (userId: string) => {
    setShowSearch(false);
    setSearchQuery('');
    navigate(`/users/${userId}`);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-10 bg-background py-4 px-4 border-b border-border">
        {showSearch ? (
          <div className="flex items-center gap-2">
            <Input
              type="text"
              placeholder="Search runners..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
              autoFocus
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setShowSearch(false);
                setSearchQuery('');
              }}
            >
              <X size={20} />
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="w-10" /> {/* Spacer for alignment */}
            <div className="text-center flex-1">
              <h1 className="text-2xl font-black uppercase tracking-tight">
                Leaderboard
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {currentMonth} Rankings
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSearchClick}
            >
              <Search size={20} />
            </Button>
          </div>
        )}
      </div>

      {/* Search Results */}
      {showSearch && searchQuery.length >= 2 && (
        <div className="container px-4 py-2 border-b border-border">
          {searchResults.length > 0 ? (
            <div className="space-y-1">
              {searchResults.map((result) => (
                <button
                  key={result.user_id}
                  onClick={() => handleSearchResultClick(result.user_id)}
                  className="w-full text-left py-2 px-2 hover:bg-muted transition-colors font-medium"
                >
                  {result.username}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-2">No runners found</p>
          )}
        </div>
      )}

      <div className="container px-4 py-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-pulse text-lg font-semibold">Loading...</div>
          </div>
        ) : leaderboard && leaderboard.length > 0 ? (
          <div className="space-y-2">
            {/* Header */}
            <div className="grid grid-cols-12 gap-2 py-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              <div className="col-span-2 text-center">#</div>
              <div className="col-span-7">Runner</div>
              <div className="col-span-3 text-right">Days</div>
            </div>

            {/* Entries */}
            {leaderboard.map((entry, index) => {
              const isCurrentUser = profile?.username === entry.username;
              
              return (
                <div 
                  key={entry.id}
                  className={`grid grid-cols-12 gap-2 py-3 items-center ${
                    isCurrentUser ? 'bg-foreground text-background' : ''
                  } ${index < 3 ? 'font-bold' : ''}`}
                >
                  <div className="col-span-2 text-center text-lg">
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                  </div>
                  <div className="col-span-7 font-medium truncate">
                    <button
                      onClick={() => entry.user_id && handleUsernameClick(entry.user_id)}
                      className={`hover:underline text-left ${
                        isCurrentUser ? 'text-background' : 'text-foreground'
                      }`}
                    >
                      {entry.username}
                      {isCurrentUser && ' (you)'}
                    </button>
                  </div>
                  <div className="col-span-3 text-right font-bold">
                    {entry.run_count}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-lg font-semibold">No runners yet</p>
            <p className="text-sm mt-1">Be the first to check in!</p>
          </div>
        )}
      </div>
    </div>
  );
}
