import { ReactNode } from 'react';
import { TabNavigation } from './TabNavigation';
import { LogCoffeeEntryProvider } from '@/contexts/LogCoffeeEntryContext';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <LogCoffeeEntryProvider>
      <div className="mx-auto min-h-screen w-full max-w-[430px] bg-background">
        {children}
        <TabNavigation />
      </div>
    </LogCoffeeEntryProvider>
  );
}
