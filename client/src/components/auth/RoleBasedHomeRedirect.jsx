import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { PUBLIC_DEMO_MODE, PUBLIC_HOME_PATH } from '../../config/appMode';
import LoadingSpinner from '../shared/LoadingSpinner';

export const getDefaultHomePath = (user) => {
  if (PUBLIC_DEMO_MODE) {
    return PUBLIC_HOME_PATH;
  }

  return user?.role === 'advertiser' ? '/advertiser' : '/n-connect';
};

const RoleBasedHomeRedirect = () => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner fullHeight />;
  }

  return <Navigate to={getDefaultHomePath(isAuthenticated ? user : null)} replace />;
};

export default RoleBasedHomeRedirect;
