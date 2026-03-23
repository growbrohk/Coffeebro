import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { Layout } from "@/components/Layout";
import CheckPage from "./pages/CheckPage";
import CalendarPage from "./pages/CalendarPage";
import ProfilePage from "./pages/ProfilePage";
import UserCalendarPage from "./pages/UserCalendarPage";
import CreateCoffeeOffer from "./pages/CreateCoffeeOffer";
import ScanPage from "./pages/Scan";
import OfferParticipantsPage from "./pages/OfferParticipantsPage";
import QuizPage from "./pages/QuizPage";
import QuizResultPage from "./pages/QuizResultPage";
import NotFound from "./pages/NotFound";
import HuntMapPage from "./pages/HuntMapPage";
import HuntScanPage from "./pages/HuntScanPage";
import TreasureDetailPage from "./pages/TreasureDetailPage";
import MyVouchersPage from "./pages/MyVouchersPage";
import HostHuntsPage from "./pages/HostHuntsPage";
import HostOffersPage from "./pages/HostOffersPage";
import HuntManagePage from "./pages/HuntManagePage";

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
              <Route path="/" element={<Navigate to="/hunts" replace />} />
              <Route path="/check" element={<CheckPage />} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/users/:userId" element={<UserCalendarPage />} />
              <Route path="/host/offer/create" element={<CreateCoffeeOffer />} />
              <Route path="/host/offer/:offerId/edit" element={<CreateCoffeeOffer />} />
              <Route path="/host/offers" element={<HostOffersPage />} />
              <Route path="/offers/:offerId/participants" element={<OfferParticipantsPage />} />
              <Route path="/scan" element={<ScanPage />} />
              <Route path="/hunts" element={<HuntMapPage />} />
              <Route path="/hunts/:huntId" element={<Navigate to="map" replace />} />
              <Route path="/hunts/:huntId/map" element={<HuntMapPage />} />
              <Route path="/hunts/:huntId/treasures/:treasureId" element={<TreasureDetailPage />} />
              <Route path="/hunts/:huntId/scan" element={<HuntScanPage />} />
              <Route path="/vouchers" element={<MyVouchersPage />} />
              <Route path="/host/hunt/create" element={<Navigate to="/host/offer/create?mode=hunt" replace />} />
              <Route path="/host/hunts" element={<HostHuntsPage />} />
              <Route path="/host/hunts/:huntId" element={<HuntManagePage />} />
              <Route path="/q" element={<QuizPage />} />
              <Route path="/q/result" element={<QuizResultPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Layout>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
