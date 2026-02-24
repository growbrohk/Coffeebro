import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { Layout } from "@/components/Layout";
import CheckPage from "./pages/CheckPage";
import CalendarPage from "./pages/CalendarPage";
import LeaderboardPage from "./pages/LeaderboardPage";
import ProfilePage from "./pages/ProfilePage";
import MessagesPage from "./pages/MessagesPage";
import UserCalendarPage from "./pages/UserCalendarPage";
 import HostEventPage from "./pages/HostEventPage";
 import HostParticipantsPage from "./pages/HostParticipantsPage";
import CreateCoffeeOffer from "./pages/CreateCoffeeOffer";
import MyEventsPage from "./pages/MyEventsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Layout>
            <Routes>
              <Route path="/" element={<CheckPage />} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/leaderboard" element={<LeaderboardPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/messages" element={<MessagesPage />} />
              <Route path="/users/:userId" element={<UserCalendarPage />} />
               <Route path="/host/event/create" element={<HostEventPage />} />
               <Route path="/host/offer/create" element={<CreateCoffeeOffer />} />
               <Route path="/host/participants" element={<HostParticipantsPage />} />
              <Route path="/events/my" element={<MyEventsPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Layout>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
