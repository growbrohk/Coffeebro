import { MapPin, Search, Calendar, User, Ticket } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const tabs = [
  { path: '/explore', label: 'Explore', icon: Search },
  { path: '/calendar', label: 'Calendar', icon: Calendar },
  { path: '/hunts', label: 'Hunt', icon: MapPin, pathMatch: 'prefix' as const },
  { path: '/vouchers', label: 'Vouchers', icon: Ticket },
  { path: '/profile', label: 'Profile', icon: User },
];

export function TabNavigation() {
  const location = useLocation();

  return (
    <nav className="tab-nav">
      <div className="mx-auto flex w-full max-w-[430px] items-stretch">
        {tabs.map((tab) => {
          const isActive = tab.pathMatch === 'prefix'
            ? location.pathname.startsWith(tab.path)
            : location.pathname === tab.path;
          const Icon = tab.icon;
          
          return (
            <Link
              key={tab.path}
              to={tab.path}
              className={`flex-1 tab-item ${isActive ? 'tab-item-active' : ''}`}
            >
              <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-xs font-medium mt-1">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
