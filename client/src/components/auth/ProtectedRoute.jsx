/**
 * ProtectedRoute Component
 * Protects routes that require authentication and/or specific roles
 */

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../shared/LoadingSpinner';

/**
 * ProtectedRoute - Wraps routes that require authentication
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child components to render if authorized
 * @param {string[]} props.requiredRoles - Array of roles allowed to access (optional)
 * @param {string} props.redirectTo - Path to redirect if unauthorized (default: /login)
 */
const ProtectedRoute = ({
  children,
  requiredRoles = [],
  redirectTo = '/login'
}) => {
  const { isAuthenticated, user, isLoading } = useAuth();
  const location = useLocation();

  // Show loading state while checking auth
  if (isLoading) {
    return <LoadingSpinner fullHeight />;
  }

  // Not authenticated - redirect to login
  if (!isAuthenticated) {
    // Save the attempted URL for redirect after login
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // Check role-based access if roles are specified
  if (requiredRoles.length > 0) {
    const userRole = user?.role || 'user';
    const hasRequiredRole = requiredRoles.includes(userRole);

    if (!hasRequiredRole) {
      // User doesn't have required role - redirect to dashboard with error
      return (
        <Navigate
          to="/"
          state={{
            error: '이 페이지에 접근할 권한이 없습니다.',
            requiredRole: requiredRoles.join(', ')
          }}
          replace
        />
      );
    }
  }

  // Authorized - render children
  return children;
};

/**
 * AdminRoute - Shortcut for admin-only routes
 */
export const AdminRoute = ({ children }) => (
  <ProtectedRoute requiredRoles={['admin', 'superadmin']}>
    {children}
  </ProtectedRoute>
);

/**
 * AdvertiserRoute - Shortcut for advertiser routes
 */
export const AdvertiserRoute = ({ children }) => (
  <ProtectedRoute requiredRoles={['advertiser', 'admin', 'superadmin']}>
    {children}
  </ProtectedRoute>
);

export default ProtectedRoute;
