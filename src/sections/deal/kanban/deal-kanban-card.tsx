import { useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Menu from '@mui/material/Menu';
import Avatar from '@mui/material/Avatar';
import { alpha } from '@mui/material/styles';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';

import { stringToColor, stringToDarkColor } from 'src/utils/color-utils';

import { Iconify } from 'src/components/iconify';

type Props = {
  deal: any;
  onClick?: VoidFunction;
  onEdit?: VoidFunction;
  onDelete?: VoidFunction;
  permissions?: {
    write: boolean;
    delete: boolean;
  };
};

export default function DealKanbanCard({
  deal,
  onClick,
  onEdit,
  onDelete,
  permissions = { write: true, delete: true },
}: Props) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) onEdit();
    handleCloseMenu();
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) onDelete();
    handleCloseMenu();
  };

  const contactText = deal.contact_name || deal.contact || '';

  return (
    <Card
      onClick={onClick}
      sx={{
        minHeight: 200,
        p: 2,
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        borderRadius: 1.5,
        border: '1px solid',
        borderColor: 'divider',
        boxShadow: (theme) =>
          `0px 4px 12px ${alpha(theme.palette.grey[500], 0.12)}`,
        transition: 'all .25s ease',
        '&:hover': {
          transform: 'translateY(-3px)',
          boxShadow: (theme) => theme.customShadows.z20,
        },
      }}
    >
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
          {/* <Label
            variant="soft"
            color="info"
            sx={{
              fontSize: 10,
              fontWeight: 700,
            }}
          >
            {deal.type || 'New Business'}
          </Label> */}

        <Typography
          variant="subtitle2"
          sx={{
            fontWeight: 700,
            mb: 0.5,
          }}
        >
          {deal.deal_title}
        </Typography>

          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenMenu(e);
            }}
            sx={{ color: 'text.disabled', p: 0.5, mt: -0.5, mr: -0.5 }}
          >
            <Iconify icon="eva:more-vertical-fill" width={18} />
          </IconButton>
        </Box>

        <Typography
          variant="body2"
          sx={{
            color: 'text.secondary',
            fontWeight: 600,
            mb: 0.5,
          }}
        >
          {deal.account_name || deal.account || 'No Company'}
        </Typography>

        {contactText && (
          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
            }}
          >
            <Iconify icon="solar:user-bold" width={12} />
            {contactText}
          </Typography>
        )}
      </Box>

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          mt: 2,
        }}
      >
        <Avatar
          sx={{
            width: 25,
            height: 25,
            fontSize: 10,
            fontWeight: 700,
            bgcolor: stringToColor(deal.owner || 'Unassigned'),
            color: stringToDarkColor(deal.owner || 'Unassigned'),
          }}
        >
          {deal.owner?.charAt(0)?.toUpperCase() || 'U'}
        </Avatar>

        <Typography
          variant="caption"
          sx={{
            fontWeight: 600,
          }}
        >
          {deal.owner || 'Unassigned'}
        </Typography>
      </Box>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleCloseMenu}
        onClick={(e) => e.stopPropagation()}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: { width: 140 }
          }
        }}
      >
        {permissions.write && (
          <MenuItem
            onClick={handleEdit}
            sx={{
              gap: 1.5,
              typography: 'body2',
              fontWeight: 600,
              color: 'info.main',
              '& svg': { color: 'inherit' }
            }}
          >
            <Iconify icon="solar:pen-bold" width={18} />
            Edit
          </MenuItem>
        )}

        {permissions.delete && (
          <MenuItem
            onClick={handleDelete}
            sx={{
              gap: 1.5,
              typography: 'body2',
              fontWeight: 600,
              color: 'error.main',
              '& svg': { color: 'inherit' }
            }}
          >
            <Iconify icon="solar:trash-bin-trash-bold" width={18} />
            Delete
          </MenuItem>
        )}

        {!permissions.write && !permissions.delete && (
          <MenuItem disabled sx={{ typography: 'caption', color: 'text.disabled', textAlign: 'center', py: 2 }}>
            No Permissions
          </MenuItem>
        )}
      </Menu>
    </Card>
  );
}
