import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { Layout } from "@/components/Layout";
import ExplorePage from "./pages/ExplorePage";
import CalendarPage from "./pages/CalendarPage";
import ProfilePage from "./pages/ProfilePage";
import SettingsPage from "./pages/SettingsPage";
import UserCalendarPage from "./pages/UserCalendarPage";
import UserPublicVouchersPage from "./pages/UserPublicVouchersPage";
import ScanPage from "./pages/Scan";
import QuizPage from "./pages/QuizPage";
import QuizResultPage from "./pages/QuizResultPage";
import NotFound from "./pages/NotFound";
import HuntMapPage from "./pages/HuntMapPage";
import HuntScanPage from "./pages/HuntScanPage";
import MyVouchersPage from "./pages/MyVouchersPage";
import LeaderboardPage from "./pages/LeaderboardPage";
import AdminOrgsPage from "./pages/AdminOrgsPage";
import HostOrgEditPage from "./pages/HostOrgEditPage";
import HostOrgsPage from "./pages/HostOrgsPage";
import OrgMenuPage from "./pages/OrgMenuPage";
import OrgCampaignsPage from "./pages/OrgCampaignsPage";
import OrgCampaignEditorPage from "./pages/OrgCampaignEditorPage";
import CampaignParticipantsPage from "./pages/CampaignParticipantsPage";
import CampaignDetailPage from "./pages/CampaignDetailPage";
import OrgPublicPage from "./pages/OrgPublicPage";

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
              <Route path="/explore" element={<ExplorePage />} />
              <Route path="/check" element={<Navigate to="/explore" replace />} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/users/:userId/vouchers" element={<UserPublicVouchersPage />} />
              <Route path="/users/:userId" element={<UserCalendarPage />} />
              <Route path="/scan" element={<ScanPage />} />
              <Route path="/hunts" element={<HuntMapPage />} />
              <Route path="/hunts/:huntId" element={<Navigate to="/hunts" replace />} />
              <Route path="/hunts/:huntId/map" element={<Navigate to="/hunts" replace />} />
              <Route path="/hunts/:huntId/treasures/:treasureId" element={<Navigate to="/hunts" replace />} />
              <Route path="/hunts/scan" element={<HuntScanPage />} />
              <Route path="/hunts/:huntId/scan" element={<Navigate to="/hunts/scan" replace />} />
              <Route path="/campaigns/:campaignId" element={<CampaignDetailPage />} />
              <Route path="/orgs/:orgId" element={<OrgPublicPage />} />
              <Route path="/vouchers" element={<MyVouchersPage />} />
              <Route path="/leaderboard" element={<LeaderboardPage />} />
              <Route path="/admin/orgs" element={<AdminOrgsPage />} />
              <Route path="/host/orgs" element={<HostOrgsPage />} />
              <Route path="/host/org/:orgId" element={<HostOrgEditPage />} />
              <Route path="/org/:orgId/menu" element={<OrgMenuPage />} />
              <Route path="/org/:orgId/campaigns" element={<OrgCampaignsPage />} />
              <Route path="/org/:orgId/campaigns/:campaignId" element={<OrgCampaignEditorPage />} />
              <Route
                path="/org/:orgId/campaigns/:campaignId/participants"
                element={<CampaignParticipantsPage />}
              />
              <Route path="/host/hunt/create" element={<Navigate to="/host/orgs" replace />} />
              <Route path="/host/hunts" element={<Navigate to="/host/orgs" replace />} />
              <Route path="/host/hunts/:huntId" element={<Navigate to="/host/orgs" replace />} />
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
