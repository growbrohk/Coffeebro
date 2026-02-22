import { Trophy, Check, Calendar, User, Send } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useUnreadCount, useThreadsSubscription } from '@/hooks/useMessages';

const tabs = [
  { path: '/leaderboard', icon: Trophy, label: 'Rank' },
  { path: '/calendar', icon: Calendar, label: 'Calendar' },
  { path: '/', icon: Check, label: 'Check' },
  { path: '/messages', icon: Send, label: 'Messages', showBadge: true },
  { path: '/profile', icon: User, label: 'Profile' },
];

export function TabNavigation() {
  const location = useLocation();
  const unreadCount = useUnreadCount();
  
  // Subscribe to thread updates for realtime badge
  useThreadsSubscription();

  return (
    <nav className="tab-nav">
      <div className="flex items-stretch">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          const Icon = tab.icon;
          const showBadge = tab.showBadge && unreadCount > 0;
          
          return (
            <Link
              key={tab.path}
              to={tab.path}
              className={`flex-1 tab-item ${isActive ? 'tab-item-active' : ''}`}
            >
              <div className="relative">
                <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                {showBadge && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </div>
              <span className="text-xs font-medium mt-1">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
