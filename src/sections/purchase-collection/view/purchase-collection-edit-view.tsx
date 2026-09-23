import type { PurchaseCollection } from 'src/api/purchase-collection';

import { useParams } from 'react-router-dom';
import { IoMdArrowBack } from "react-icons/io";
import { useRef, useState, useEffect } from 'react';

import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

import { useRouter } from 'src/routes/hooks';

import { DashboardContent } from 'src/layouts/dashboard';
import { getPurchaseCollection } from 'src/api/purchase-collection';

import PurchaseCollectionNewEditForm from '../purchase-collection-new-edit-form';

// ----------------------------------------------------------------------

export function PurchaseCollectionEditView() {
    const params = useParams();
    const { id } = params;
    const router = useRouter();
    const formRef = useRef<any>(null);

    const [currentPurchaseCollection, setCurrentPurchaseCollection] = useState<PurchaseCollection>();
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (id) {
            getPurchaseCollection(id as string).then(setCurrentPurchaseCollection);
        }
    }, [id]);

    const handleSave = () => {
        if (formRef.current) {
            formRef.current.handleSubmit();
        }
    };

    const handleCancel = () => {
        router.push('/purchase?tab=collections');
    };

    return (
        <DashboardContent maxWidth={false}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={5} mt={3}>
                <Typography variant="h4">
                    Edit Settlement: {currentPurchaseCollection?.name}
                </Typography>
                <Stack direction="row" spacing={2}>
                    <Button
                        variant="outlined"
                        color="inherit"
                        onClick={handleCancel}
                        disabled={loading}
                        startIcon={<IoMdArrowBack size={20} />}
                        sx={{
                            borderRadius: 1.5,
                            fontWeight: 600,
                            textTransform: 'none',
                            px: 2.5,
                            '&:hover': {
                                bgcolor: (theme) => alpha(theme.palette.text.primary, 0.04),
                                borderColor: 'text.primary',
                            }
                        }}
                    >
                        Go Back
                    </Button>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handleSave}
                        disabled={loading}
                        sx={{ 
                            borderRadius: 1.5, 
                            fontWeight: 600, 
                            textTransform: 'none', 
                            bgcolor: '#059669', 
                            color: 'common.white', 
                            '&:hover': { bgcolor: '#047857' } 
                        }}
                    >
                        {loading ? 'Saving...' : 'Update Settlement'}
                    </Button>
                </Stack>
            </Stack>

            <PurchaseCollectionNewEditForm
                ref={formRef}
                currentPurchaseCollection={currentPurchaseCollection}
                onLoadingChange={setLoading}
            />
        </DashboardContent>
    );
}
