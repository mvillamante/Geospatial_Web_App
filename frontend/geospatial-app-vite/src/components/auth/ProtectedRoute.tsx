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

  const hasAccess = allowedRoles.includes(userRole);
  
  // Verify user role access authorization
  if (!hasAccess) {
    // Redirect unauthorized user to default role route
    const redirectPath = userRole ? roleToBasePath(userRole as any) : "/";
    return <Navigate to={redirectPath} replace />;
  }
  
  return children;
};

