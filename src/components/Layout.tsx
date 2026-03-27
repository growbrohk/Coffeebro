import { ReactNode } from 'react';
import { TabNavigation } from './TabNavigation';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="mx-auto min-h-screen w-full max-w-[430px] bg-background">
      {children}
      <TabNavigation />
    </div>
  );
}
