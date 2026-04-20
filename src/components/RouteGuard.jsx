import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useViewAs } from '../hooks/useViewAs';
import { canAccessRoute } from '../utils/roleUtils';

/**
 * RouteGuard — blocks routes the effective role can't access (§ 38.6).
 *
 * Uses `effectiveRoles` from useViewAs so admin impersonating a lower role
 * experiences the same access denials as that role (preview behavior, § 38.5).
 *
 * On block, redirects to `/` with `location.state.blockedRoute` set so
 * MainPage can surface a toast ("Role X doesn't have access — redirected").
 */
export default function RouteGuard({ children }) {
  const { effectiveRoles } = useViewAs();
  const location = useLocation();
  if (!canAccessRoute(effectiveRoles, location.pathname)) {
    return <Navigate to="/" replace state={{ blockedRoute: location.pathname }} />;
  }
  return children;
}
