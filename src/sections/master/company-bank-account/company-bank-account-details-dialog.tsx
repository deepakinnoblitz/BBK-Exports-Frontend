import type { CompanyBankAccount } from 'src/api/masters';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';

import { getCompanyBankAccount } from 'src/api/masters';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = {
  open: boolean;
  onClose: () => void;
  accountId: string | null;
};

export function CompanyBankAccountDetailsDialog({ open, onClose, accountId }: Props) {
  const [account, setAccount] = useState<CompanyBankAccount | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (open && accountId) {
        try {
          setLoading(true);
          const doc = await getCompanyBankAccount(accountId);
          setAccount(doc);
        } catch (err) {
          console.error('Failed to fetch company bank account details:', err);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchData();
  }, [open, accountId]);

  const renderStatus = (status?: string) => (
    <Label
      variant="soft"
      color={status === 'Inactive' ? 'default' : 'success'}
      sx={{ textTransform: 'uppercase', fontWeight: 800 }}
    >
      {status || 'Active'}
    </Label>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      TransitionProps={{ onExited: () => setAccount(null) }}
      PaperProps={{
        sx: {
          borderRadius: 2,
        },
      }}
    >
      <DialogTitle
        sx={{
          m: 0,
          p: 2,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid', borderColor: 'divider' 
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 800 }}>
          Company Bank Account Details
        </Typography>
        <IconButton
          onClick={onClose}
          sx={{
            color: (theme) => theme.palette.grey[500],
            bgcolor: 'background.paper',
            boxShadow: (theme) => theme.customShadows?.z1,
          }}
        >
          <Iconify icon="mingcute:close-line" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 4, m: 2, mt: 4 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 10 }}>
            <Iconify icon={'svg-spinners:12-dots-scale-rotate' as any} width={40} sx={{ color: 'primary.main' }} />
          </Box>
        ) : account ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <Box
                sx={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: (theme) =>
                    `linear-gradient(135deg, ${theme.palette.primary.light} 0%, ${theme.palette.primary.main} 100%)`,
                  color: 'white',
                  flexShrink: 0,
                  boxShadow: (theme) => theme.customShadows?.z8 || theme.shadows[8],
                }}
              >
                <Iconify icon={'solar:card-bold' as any} width={32} />
              </Box>

              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.5 }}>
                  {account.bank_name}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                  {account.account_holder_name || 'No account holder name'}
                </Typography>
              </Box>

              <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                {renderStatus(account.status)}
                <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.disabled', fontWeight: 700 }}>
                  ID: {account.name}
                </Typography>
              </Box>
            </Box>

            <Divider sx={{ borderStyle: 'dashed' }} />

            <Box>
              <SectionHeader title="Bank Account Information" />
              <Box
                sx={{
                  display: 'grid',
                  gap: 3,
                  gridTemplateColumns: { xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
                }}
              >
                <DetailItem label="Bank Name" value={account.bank_name} icon="solar:buildings-bold" />
                <DetailItem label="Account Holder Name" value={account.account_holder_name} icon="solar:user-id-bold" />
                <DetailItem label="Account No" value={account.account_no} icon="solar:card-bold" />
                <DetailItem label="IFSC Code" value={account.ifsc_code} icon="solar:plain-2-bold" />
                <DetailItem label="UPI ID" value={account.upi_id} icon="solar:wallet-bold" />
                <DetailItem label="Status" value={account.status || 'Active'} isStatus />
              </Box>
            </Box>
          </Box>
        ) : (
          <Box sx={{ py: 10, textAlign: 'center' }}>
            <Iconify icon={'solar:ghost-bold' as any} width={64} sx={{ color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" sx={{ color: 'text.secondary' }}>
              No Details Found
            </Typography>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ----------------------------------------------------------------------

function SectionHeader({ title }: { title: string }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
      <Typography
        variant="body1"
        sx={{
          fontWeight: 800,
          textTransform: 'uppercase',
          fontSize: '16px',
          color: 'text.primary',
        }}
      >
        {title}
      </Typography>
    </Box>
  );
}

function DetailItem({
  label,
  value,
  icon,
  isStatus = false,
}: {
  label: string;
  value?: string;
  icon?: string;
  isStatus?: boolean;
}) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Typography
        variant="caption"
        sx={{ color: 'text.secondary', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 }}
      >
        {label}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        {icon && (
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
              color: 'primary.main',
            }}
          >
            <Iconify icon={icon as any} width={18} />
          </Box>
        )}
        {isStatus ? (
          <Label
            variant="soft"
            color={value === 'Inactive' ? 'default' : 'success'}
            sx={{ textTransform: 'uppercase', fontWeight: 800 }}
          >
            {value || 'Active'}
          </Label>
        ) : (
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            {value || '-'}
          </Typography>
        )}
      </Box>
    </Box>
  );
}
