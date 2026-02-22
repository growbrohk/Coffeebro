import { useState } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useUserMonthlyRuns, useUserProfile } from '@/hooks/useUserRuns';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export default function UserCalendarPage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [viewDate, setViewDate] = useState(new Date());
  
  const { data: profile, isLoading: profileLoading } = useUserProfile(userId);
  const { data: runs = [], isLoading: runsLoading } = useUserMonthlyRuns(
    userId,
    viewDate.getFullYear(),
    viewDate.getMonth()
  );

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

  // Get first day of month and total days
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Create run dates set for quick lookup
  const runDates = new Set(runs.map(r => new Date(r.run_date).getDate()));

  const goToPrevMonth = () => {
    setViewDate(new Date(year, month - 1, 1));
  };

  const goToNextMonth = () => {
    setViewDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setViewDate(new Date());
  };

  // If not loading and not authenticated, redirect to login
  if (!loading && !user) {
    return <Navigate to="/profile?msg=view-calendar" replace />;
  }

  const isLoading = loading || profileLoading || runsLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-lg font-semibold">Loading...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-lg font-semibold">User not found</p>
          <Button 
            variant="ghost" 
            onClick={() => navigate('/leaderboard')}
            className="mt-4"
          >
            Back to Leaderboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background py-4 px-4 border-b border-border">
        <div className="flex items-center justify-between">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate('/leaderboard')}
          >
            <ChevronLeft size={24} />
          </Button>
          <h1 className="text-lg font-black uppercase tracking-tight text-center flex-1">
            {profile.username}'s Calendar
          </h1>
          <div className="w-10" /> {/* Spacer for alignment */}
        </div>
      </div>

      <div className="container px-4 py-6">
        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" size="icon" onClick={goToPrevMonth}>
            <ChevronLeft size={24} />
          </Button>
          
          <button 
            onClick={goToToday}
            className="text-xl font-bold uppercase tracking-tight"
          >
            {MONTHS[month]} {year}
          </button>
          
          <Button variant="ghost" size="icon" onClick={goToNextMonth}>
            <ChevronRight size={24} />
          </Button>
        </div>

        {/* Day Headers */}
        <div className="grid grid-cols-7 mb-2">
          {DAYS.map((day, i) => (
            <div 
              key={i} 
              className="text-center text-sm font-semibold text-muted-foreground py-2"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Empty cells for days before first of month */}
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} className="calendar-day" />
          ))}

          {/* Days of month */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const hasRun = runDates.has(day);
            const isToday = isCurrentMonth && today.getDate() === day;

            return (
              <div
                key={day}
                className={`calendar-day ${hasRun ? 'calendar-day-run' : ''} ${isToday ? 'calendar-day-today' : ''}`}
              >
                {hasRun ? '✓' : day}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-8 flex items-center justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-foreground flex items-center justify-center text-background text-xs">
              ✓
            </div>
            <span className="text-muted-foreground">Run day</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 border-2 border-foreground" />
            <span className="text-muted-foreground">Today</span>
          </div>
        </div>

        {/* CTA for non-trackers */}
        <div className="mt-12 text-center">
          <button
            onClick={() => navigate('/profile')}
            className="text-sm text-muted-foreground underline hover:text-foreground transition-colors"
          >
            Want to track yours? Sign up.
          </button>
        </div>
      </div>
    </div>
  );
}
