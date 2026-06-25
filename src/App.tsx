import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
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
import CampaignCheckoutPage from "./pages/CampaignCheckoutPage";
import CampaignClaimSuccessPage from "./pages/CampaignClaimSuccessPage";
import OrgPublicPage from "./pages/OrgPublicPage";
import AllMyCafesPage from "./pages/loyalty/AllMyCafesPage";
import ShopFanDashboardPage from "./pages/loyalty/ShopFanDashboardPage";
import ShopLoyaltyManagerPage from "./pages/host/ShopLoyaltyManagerPage";
import VoucherStudioPage from "./pages/host/VoucherStudioPage";
import AdminTastingPackagesPage from "./pages/AdminTastingPackagesPage";
import AdminTastingPackageEditorPage from "./pages/AdminTastingPackageEditorPage";
import AdminTastingTrackingDashboardPage from "./pages/admin/tasting-tracking/AdminTastingTrackingDashboardPage";
import AdminTastingPackageDetailPage from "./pages/admin/tasting-tracking/AdminTastingPackageDetailPage";
import AdminTastingPurchaseDetailPage from "./pages/admin/tasting-tracking/AdminTastingPurchaseDetailPage";
import AdminTastingRedemptionsPage from "./pages/admin/tasting-tracking/AdminTastingRedemptionsPage";
import AdminTastingShopSummaryPage from "./pages/admin/tasting-tracking/AdminTastingShopSummaryPage";
import HostTastingDashboardPage from "./pages/host/HostTastingDashboardPage";
import HostTastingRedemptionsPage from "./pages/host/HostTastingRedemptionsPage";
import HostTastingTrackingPage from "./pages/host/HostTastingTrackingPage";
import TastingPackageDetailPage from "./pages/TastingPackageDetailPage";
import TastingPackageCheckoutPage from "./pages/TastingPackageCheckoutPage";
import TastingPackagePurchaseSuccessPage from "./pages/TastingPackagePurchaseSuccessPage";

const queryClient = new QueryClient();

function LoyaltyActivityToDashboard() {
  const { orgId } = useParams<{ orgId: string }>();
  if (!orgId) return <Navigate to="/loyalty/cafes" replace />;
  return <Navigate to={`/loyalty/orgs/${orgId}`} replace />;
}

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
              <Route path="/campaigns/:campaignId/checkout" element={<CampaignCheckoutPage />} />
              <Route path="/campaigns/:campaignId/claim/success" element={<CampaignClaimSuccessPage />} />
              <Route path="/campaigns/:campaignId" element={<CampaignDetailPage />} />
              <Route path="/loyalty/cafes" element={<AllMyCafesPage />} />
              <Route path="/loyalty/orgs/:orgId/activity" element={<LoyaltyActivityToDashboard />} />
              <Route path="/loyalty/orgs/:orgId" element={<ShopFanDashboardPage />} />
              <Route path="/host/org/:orgId/loyalty" element={<ShopLoyaltyManagerPage />} />
              <Route path="/host/org/:orgId/loyalty/vouchers" element={<VoucherStudioPage />} />
              <Route path="/host/tasting-tracking" element={<HostTastingTrackingPage />} />
              <Route path="/host/org/:orgId/tasting" element={<HostTastingDashboardPage />} />
              <Route path="/host/org/:orgId/redemptions" element={<HostTastingRedemptionsPage />} />
              <Route path="/orgs/:orgId" element={<OrgPublicPage />} />
              <Route path="/vouchers" element={<MyVouchersPage />} />
              <Route path="/leaderboard" element={<LeaderboardPage />} />
              <Route path="/admin/orgs" element={<AdminOrgsPage />} />
              <Route path="/admin/tasting-packages" element={<AdminTastingPackagesPage />} />
              <Route path="/admin/tasting-packages/new" element={<AdminTastingPackageEditorPage />} />
              <Route path="/admin/tasting-packages/:id" element={<AdminTastingPackageEditorPage />} />
              <Route path="/admin/tasting-tracking" element={<AdminTastingTrackingDashboardPage />} />
              <Route
                path="/admin/tasting-tracking/packages/:packageId"
                element={<AdminTastingPackageDetailPage />}
              />
              <Route
                path="/admin/tasting-tracking/purchases/:purchaseId"
                element={<AdminTastingPurchaseDetailPage />}
              />
              <Route path="/admin/tasting-tracking/redemptions" element={<AdminTastingRedemptionsPage />} />
              <Route path="/admin/tasting-tracking/shops" element={<AdminTastingShopSummaryPage />} />
              <Route path="/tasting-packages/:id/checkout" element={<TastingPackageCheckoutPage />} />
              <Route path="/tasting-packages/:id/purchase/success" element={<TastingPackagePurchaseSuccessPage />} />
              <Route path="/tasting-packages/:id" element={<TastingPackageDetailPage />} />
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
