import { ReactNode } from 'react';
import { TabNavigation } from './TabNavigation';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      {children}
      <TabNavigation />
    </div>
  );
}
