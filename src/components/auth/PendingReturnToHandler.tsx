import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { consumePendingReturnTo } from '@/lib/tastingAffiliateRef';

function isTempProfileUsername(name: string) {
  return name.startsWith('temp_');
}

/** After OAuth or profile login, resume tasting checkout when a return path was stored. */
export function PendingReturnToHandler() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const handledRef = useRef(false);

  useEffect(() => {
    handledRef.current = false;
  }, [user?.id]);

  useEffect(() => {
    if (loading || !user || !profile || handledRef.current) return;
    if (isTempProfileUsername(profile.username)) return;

    const returnTo = consumePendingReturnTo();
    if (!returnTo) return;

    const currentPath = `${location.pathname}${location.search}`;
    if (currentPath === returnTo) return;

    handledRef.current = true;
    navigate(returnTo, { replace: true });
  }, [user, profile, loading, location.pathname, location.search, navigate]);

  return null;
}
