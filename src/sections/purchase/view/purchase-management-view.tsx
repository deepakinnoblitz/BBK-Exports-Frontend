import { useState, useCallback } from 'react';
import { HiOutlineBanknotes, HiOutlineShoppingBag } from "react-icons/hi2";

import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { useRouter, usePathname } from 'src/routes/hooks';

import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';

import { useAuth } from 'src/auth/auth-context';

import { PurchaseListView } from './purchase-list-view';
import { PurchaseCollectionListView } from '../../purchase-collection/view/purchase-collection-list-view';

// ----------------------------------------------------------------------

const TABS = [
    { value: 'purchases', label: 'Purchases', icon: <HiOutlineShoppingBag size={22} /> },
    { value: 'collections', label: 'Settlements', icon: <HiOutlineBanknotes size={22} /> },
];

// ----------------------------------------------------------------------

export function PurchaseManagementView() {
    const router = useRouter();

    const { user } = useAuth();
    const hasCustomPerms = user?.permissions?.custom_permissions_assigned;
    const canCreatePurchase = hasCustomPerms && user?.permissions?.actions?.purchase ? !!user?.permissions?.actions?.purchase?.create : true;
    const canCreatePurchaseCollections = hasCustomPerms && user?.permissions?.actions?.purchase_collection ? !!user?.permissions?.actions?.purchase_collection?.create : true;
    const canViewCollections = hasCustomPerms && user?.permissions?.actions?.purchase_collection ? !!user?.permissions?.actions?.purchase_collection?.view : true;
    
    const pathname = usePathname();

    const searchParams = new URLSearchParams(window.location.search);
    const tabParam = searchParams.get('tab');

    const [currentTab, setCurrentTab] = useState(tabParam === 'collections' && canViewCollections ? 'collections' : 'purchases');

    const tabs = [
        {
            value: 'purchases',
            label: 'Purchases',
            icon: <HiOutlineShoppingBag size={22} />,
        },
        ...(canViewCollections
            ? [{
                value: 'collections',
                label: 'Settlements',
                icon: <HiOutlineBanknotes size={22} />,
            }]
            : []),
    ];

    const handleChangeTab = useCallback((event: React.SyntheticEvent, newValue: string) => {
        setCurrentTab(newValue);
        const params = new URLSearchParams(window.location.search);
        if (newValue === 'purchases') {
            params.delete('tab');
        } else {
            params.set('tab', newValue);
        }
        router.replace(`${pathname}${params.toString() ? `?${params.toString()}` : ''}`);
    }, [pathname, router]);

    const handleCreateNew = () => {
        if (currentTab === 'purchases') {
            router.push('/purchase/new');
        } else {
            router.push('/purchase-collections/new');
        }
    };

    return (
        <DashboardContent maxWidth={false} sx={{ mt: 2 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
                <Typography variant="h4">Purchase Management</Typography>
                {((currentTab === 'purchases' && canCreatePurchase) ||
                (currentTab === 'collections' && canCreatePurchaseCollections)) && (
                <Button
                    variant="contained"
                    color="info"
                    startIcon={<Iconify icon="mingcute:add-line" />}
                    onClick={handleCreateNew}
                >
                    {currentTab === 'purchases' ? 'New Purchase' : 'New Settlement'}
                </Button>
                )}
            </Stack>

            <Tabs
                value={currentTab}
                onChange={handleChangeTab}
                sx={{
                    mb: 3,
                    '& .MuiTabs-flexContainer': {
                        borderBottom: 1,
                        borderColor: 'divider',
                        width: 'fit-content',
                    },
                    '& .MuiTab-root': {
                        minHeight: 48,
                        fontWeight: 700,
                        typography: 'subtitle2',
                        marginRight: (theme) => theme.spacing(3),
                        '&:last-of-type': {
                            marginRight: 0,
                        },
                        '&.Mui-selected': { color: 'primary.main' },
                    },
                }}
            >
                {tabs.map((tab) => (
                    <Tab
                        key={tab.value}
                        value={tab.value}
                        label={tab.label}
                        icon={tab.icon}
                        iconPosition="start"
                    />
                ))}
            </Tabs>

            {currentTab === 'purchases' && <PurchaseListView hideHeader />}
            {currentTab === 'collections' && canViewCollections && <PurchaseCollectionListView hideHeader />}
        </DashboardContent>
    );
}
