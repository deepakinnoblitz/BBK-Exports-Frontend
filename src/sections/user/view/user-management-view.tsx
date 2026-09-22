import { FaUsersCog } from 'react-icons/fa';
import { FaUserPen } from "react-icons/fa6";
import { MdOutlineSecurity } from 'react-icons/md';
import { useRef, useState, useCallback } from 'react';

import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { useRouter, usePathname } from 'src/routes/hooks';

import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';

import { useAuth } from 'src/auth/auth-context';

import { UserView } from './user-view';
import { RolePermissionView } from './role-permission-view';
import { UserPermissionView } from '../../user-permission/view/user-permission-view';

// ----------------------------------------------------------------------

const TABS = [
  {
    value: 'users',
    label: 'Users List',
    icon: <FaUserPen size={24} />,
  },
  {
    value: 'permissions',
    label: 'User Permissions',
    icon: <FaUsersCog size={24} />,
  },
  {
    value: 'role_permissions',
    label: 'Role Permissions',
    icon: <MdOutlineSecurity size={22} />,
  },
];

// ----------------------------------------------------------------------

export function UserManagementView({ hideHeader = false }: { hideHeader?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();

  const usersRef = useRef<any>(null);
  const permissionsRef = useRef<any>(null);
  const rolePermissionsRef = useRef<any>(null);

  const searchParams = new URLSearchParams(window.location.search);
  const subTabParam = searchParams.get('subtab');

  const [currentTab, setCurrentTab] = useState(
    subTabParam === 'permissions' ? 'permissions' : subTabParam === 'role_permissions' ? 'role_permissions' : 'users'
  );

  const { user } = useAuth();
  const hasCustomPerms = user?.permissions?.custom_permissions_assigned && user?.permissions?.actions?.users_list;
  const canCreateUser = hasCustomPerms && user?.permissions?.actions?.users_list ? !!user?.permissions?.actions?.users_list?.create : true;
  
  const handleChangeTab = useCallback(
    (event: React.SyntheticEvent, newValue: string) => {
      setCurrentTab(newValue);
      const params = new URLSearchParams(window.location.search);
      if (newValue === 'users') {
        params.delete('subtab');
      } else {
        params.set('subtab', newValue);
      }
      router.replace(`${pathname}${params.toString() ? `?${params.toString()}` : ''}`);
    },
    [pathname, router]
  );

  const handleAddAction = () => {
    if (currentTab === 'users' && usersRef.current) {
      usersRef.current.handleOpenCreate();
    } else if (currentTab === 'permissions' && permissionsRef.current) {
      permissionsRef.current.handleOpenCreate();
    } else if (currentTab === 'role_permissions') {
      router.push('/role-permissions/new');
    }
  };

  const renderHeader = (
    <Stack direction="row" alignItems="center" justifyContent="space-between" mb={5}>
      <Typography variant="h4">User Management</Typography>
    </Stack>
  );

  const renderTabs = (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      sx={{
        width: 1,
        mb: hideHeader ? 1 : { xs: 3, md: 5 },
        borderBottom: (t) =>
          `1px border-style: solid; border-width: 0 0 1px 0; border-color: ${t.palette.divider}`,
      }}
    >
      <Tabs
        value={currentTab}
        onChange={handleChangeTab}
        sx={{
          pl: hideHeader ? 1 : 0,
          minHeight: 40,
          '& .MuiTabs-indicator': {
            height: 2,
          },
        }}
      >
        {TABS.map((tab) => (
          <Tab
            key={tab.value}
            label={tab.label}
            icon={tab.icon}
            value={tab.value}
            iconPosition="start"
            sx={{
              minWidth: 160,
              minHeight: 40,
              fontSize: 14,
              textTransform: 'none',
              fontWeight: 'fontWeightMedium',
              '&.Mui-selected': {
                color: 'primary.main',
                fontWeight: 'fontWeightBold',
              },
            }}
          />
        ))}
      </Tabs>

      {currentTab === 'users' && canCreateUser &&(
        <Button
          variant="contained"
          startIcon={<Iconify icon="mingcute:add-line" />}
          onClick={handleAddAction}
          sx={{
            bgcolor: '#059669',
            '&:hover': { bgcolor: '#047857' },
            borderRadius: 1,
            textTransform: 'none',
            fontWeight: 600,
            mr: 1,
          }}
        >
          New User
        </Button>
      )}
      {currentTab === 'role_permissions' && canCreateUser &&(
        <Button
          variant="contained"
          startIcon={<Iconify icon="mingcute:add-line" />}
          onClick={handleAddAction}
          sx={{
            bgcolor: '#059669',
            '&:hover': { bgcolor: '#047857' },
            borderRadius: 1,
            textTransform: 'none',
            fontWeight: 600,
            mr: 1,
          }}
        >
          New Role Permission
        </Button>
      )}
    </Stack>
  );

  const content = (
    <>
      {!hideHeader && renderHeader}

      {renderTabs}

      {currentTab === 'users' && <UserView ref={usersRef} hideHeader hideActionButton />}
      {currentTab === 'permissions' && (
        <UserPermissionView ref={permissionsRef} hideHeader hideActionButton />
      )}
      {currentTab === 'role_permissions' && (
        <RolePermissionView ref={rolePermissionsRef} hideHeader hideActionButton />
      )}
    </>
  );

  if (hideHeader) {
    return content;
  }

  return <DashboardContent maxWidth={false}>{content}</DashboardContent>;
}