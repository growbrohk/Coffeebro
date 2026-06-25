import { Navigate, useParams } from 'react-router-dom';

export default function HostTastingDashboardPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const search = orgId ? `?orgId=${encodeURIComponent(orgId)}` : '';
  return <Navigate to={`/host/tasting-tracking${search}`} replace />;
}
