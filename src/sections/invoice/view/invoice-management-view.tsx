import { useState, useCallback } from 'react';
import { HiOutlineDocumentCheck, HiOutlineClipboardDocumentList } from "react-icons/hi2";

import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { useRouter, usePathname } from 'src/routes/hooks';

import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';

import { useAuth } from 'src/auth/auth-context';

import { InvoiceListView } from './invoice-list-view';
import { InvoiceCollectionListView } from '../../invoice-collection/view/invoice-collection-list-view';

// ----------------------------------------------------------------------

const TABS = [
    { value: 'invoices', label: 'Invoices', icon: <HiOutlineClipboardDocumentList size={22} /> },
    { value: 'collections', label: 'Invoice Collection', icon: <HiOutlineDocumentCheck size={22} /> },
];

// ----------------------------------------------------------------------

export function InvoiceManagementView({ hideHeader = false }: { hideHeader?: boolean }) {
    const router = useRouter();
    const pathname = usePathname();
    const { user } = useAuth();
    const hasCustomPerms = user?.permissions?.custom_permissions_assigned;
    const canViewCollections = hasCustomPerms && user?.permissions?.actions?.invoice_collection ? !!user?.permissions?.actions?.invoice_collection?.view : true;
    const canCreateCollection = hasCustomPerms && user?.permissions?.actions?.invoice_collection ? !!user?.permissions?.actions?.invoice_collection?.create : true;

    const searchParams = new URLSearchParams(window.location.search);
    const subTabParam = searchParams.get('subtab');

    const [currentTab, setCurrentTab] = useState(subTabParam === 'collections' && canViewCollections ? 'collections' : 'invoices');

    const handleChangeTab = useCallback((event: React.SyntheticEvent, newValue: string) => {
        setCurrentTab(newValue);
        const params = new URLSearchParams(window.location.search);
        if (newValue === 'invoices') {
            params.delete('subtab');
        } else {
            params.set('subtab', newValue);
        }
        router.replace(`${pathname}${params.toString() ? `?${params.toString()}` : ''}`);
    }, [pathname, router]);

    const handleCreateNew = () => {
        if (currentTab === 'invoices') {
            router.push('/invoices/new');
        } else {
            router.push('/invoice-collections/new');
        }
    };

    const renderHeader = (
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={5}>
            <Typography variant="h4">Invoice Management</Typography>
            {((currentTab === 'invoices') || (currentTab === 'collections' && canCreateCollection)) && (
                <Button
                    variant="contained"
                    color="info"
                    startIcon={<Iconify icon="mingcute:add-line" />}
                    onClick={handleCreateNew}
                >
                    {currentTab === 'invoices' ? 'New Invoice' : 'New Collection'}
                </Button>
            )}
        </Stack>
    );

    const renderTabs = (
        <Tabs
            value={currentTab}
            onChange={handleChangeTab}
            sx={{
                mb: hideHeader ? 1 : { xs: 3, md: 5 },
                pl: hideHeader ? 1 : 0,
                minHeight: 40,
                '& .MuiTabs-indicator': {
                    height: 2,
                },
            }}
        >
            {TABS.filter(tab => tab.value !== 'collections' || canViewCollections).map((tab) => (
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
    );

    const content = (
        <>
            {!hideHeader && renderHeader}

            {renderTabs}

            {currentTab === 'invoices' && <InvoiceListView hideHeader />}
            {currentTab === 'collections' && canViewCollections && <InvoiceCollectionListView hideHeader />}
        </>
    );

    if (hideHeader) {
        return content;
    }

    return (
        <DashboardContent maxWidth={false} sx={{ mt: 2 }}>
            {content}
        </DashboardContent>
    );
}
