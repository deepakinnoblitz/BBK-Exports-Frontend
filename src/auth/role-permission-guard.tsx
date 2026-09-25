import type { ReactNode } from 'react';

import { Navigate, useLocation } from 'react-router-dom';

import { useAuth } from './auth-context';
import { hrNavData, employeeNavData, crmAndSalesNavData } from '../layouts/nav-config-dashboard';

type RolePermissionGuardProps = {
    children: ReactNode;
    actionKey: string;
};

// Helper function to check if a pathname matches any path inside nav item configuration (including children)
function matchNavPath(navItems: any[], pathname: string): boolean {
    const cleanPath = pathname.split('?')[0].split('#')[0];
    for (const item of navItems) {
        if (item.path && item.path !== '/' && cleanPath === item.path) {
            return true;
        }
        if (item.children) {
            if (matchNavPath(item.children, pathname)) {
                return true;
            }
        }
    }
    return false;
}

export function RolePermissionGuard({ children, actionKey }: RolePermissionGuardProps) {
    const { user } = useAuth();
    const location = useLocation();
    const hasCustomPerms = user?.permissions?.custom_permissions_assigned;

    if (hasCustomPerms) {
        const actionPerms = user?.permissions?.actions?.[actionKey];
        if (actionPerms !== undefined && !actionPerms.view) {
            return <Navigate to="/access-denied" replace />;
        }
    } else {
        const roles = user?.roles || [];
        const isAdmin = roles.some((role) => ['Administrator', 'System Manager'].includes(role));

        if (!isAdmin) {
            const pathname = location.pathname;

            // Check if current path belongs to HR Nav Config
            const isHRPath = matchNavPath(hrNavData, pathname);
            // Check if current path belongs to CRM Nav Config
            const isCRMPath = matchNavPath(crmAndSalesNavData, pathname);
            // Check if current path belongs to Employee Nav Config
            const isEmployeePath = matchNavPath(employeeNavData, pathname);

            const hasHRRole = roles.includes('HR');
            const hasCRMRole = roles.includes('CRM And Sales');
            const hasEmployeeRole = roles.includes('Employee');

            if (isEmployeePath && (hasEmployeeRole || hasHRRole || hasCRMRole)) {
                // Allowed - employee path accessed by user with valid module role
            } else if (isHRPath && !hasHRRole) {
                return <Navigate to="/access-denied" replace />;
            } else if (isCRMPath && !hasCRMRole) {
                return <Navigate to="/access-denied" replace />;
            } else if (isEmployeePath && !hasEmployeeRole && !hasHRRole && !hasCRMRole) {
                return <Navigate to="/access-denied" replace />;
            }
        }
    }

    return <>{children}</>;
}
