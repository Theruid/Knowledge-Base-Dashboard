import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface AdminRouteProps {
  redirectPath?: string;
}

const AdminRoute: React.FC<AdminRouteProps> = ({ 
  redirectPath = '/dashboard'
}) => {
  const { isAuthenticated, user, loading } = useAuth();
  
  // Show loading state while checking authentication
  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>;
  }
  
  // Check if user is authenticated and has admin role
  if (!isAuthenticated || user?.role !== 'admin') {
    return <Navigate to={redirectPath} replace />;
  }
  
  return <Outlet />;
};

export default AdminRoute;
