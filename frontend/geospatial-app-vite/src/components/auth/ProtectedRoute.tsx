import React from "react";
import { Navigate } from 'react-router-dom';
import { getUserRoleAndDisplayName } from '../../libr/auth';
import { roleToBasePath } from '../../utils/roles';

interface ProtectedRouteProps {
  children: React.ReactElement;
  allowedRoles: string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  allowedRoles 
}) => {
  const { userRole } = getUserRoleAndDisplayName();
  
  // Check if user's role is in allowed roles
  if (!allowedRoles.includes(userRole)) {
    // Redirect to their role's default page
    const redirectPath = roleToBasePath(userRole as any);
    return <Navigate to={redirectPath} replace />;
  }
  
  return children;
};

