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
  
  // Check if user's role is in allowed roles
  if (!hasAccess) {
    // Redirect to their role's default page
    const redirectPath = userRole ? roleToBasePath(userRole as any) : "/";
    return <Navigate to={redirectPath} replace />;
  }
  
  return children;
};

