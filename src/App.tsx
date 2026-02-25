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
import CreateCoffeeOffer from "./pages/CreateCoffeeOffer";
import ScanPage from "./pages/Scan";
import OfferParticipantsPage from "./pages/OfferParticipantsPage";
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
              <Route path="/host/offer/create" element={<CreateCoffeeOffer />} />
              <Route path="/offers/:offerId/participants" element={<OfferParticipantsPage />} />
              <Route path="/scan" element={<ScanPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Layout>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
