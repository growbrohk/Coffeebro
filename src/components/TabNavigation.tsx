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
      <div className="tab-nav-inner items-stretch">
        {tabs.map((tab) => {
          const isActive = tab.pathMatch === 'prefix'
            ? location.pathname.startsWith(tab.path)
            : location.pathname === tab.path;
          const Icon = tab.icon;
          
          return (
            <Link
              key={tab.path}
              to={tab.path}
              className={`tab-item ${isActive ? 'tab-item-active' : ''}`}
            >
              <Icon size={24} strokeWidth={isActive ? 2.5 : 2} className="shrink-0" />
              <span className="tab-item-label">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
