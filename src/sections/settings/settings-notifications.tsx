import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ListItemText from '@mui/material/ListItemText';

import { Iconify } from 'src/components/iconify';

import { CustomSwitch } from 'src/sections/email-settings/view/email-settings-view';

// ----------------------------------------------------------------------

type Props = {
  data: any;
  onChange: (fieldname: string, value: any) => void;
};

export function SettingsNotifications({ data, onChange }: Props) {
  const NOTIFICATIONS = [
    {
      label: 'Leave Application Mail',
      fieldname: 'leave_notification',
      description: 'Receive email alerts for leave requests and approvals.',
      icon: 'solar:calendar-date-bold-duotone',
      color: '#FFAB00',
    },
    /*
    {
      label: 'WFH Attendance Mail',
      fieldname: 'wfh_notification',
      description: 'Get notified about Work From Home attendance submissions.',
      icon: 'solar:home-2-bold-duotone',
      color: '#00B8D9',
    },
    {
      label: 'Request List Mail',
      fieldname: 'request_notification',
      description: 'Stay updated on status changes and new employee requests.',
      icon: 'solar:clipboard-list-bold-duotone',
      color: '#36B37E',
    },
    */
    {
      label: 'Reimbursement List Mail',
      fieldname: 'reimbursement_notification',
      description: 'Receive alerts for new or updated reimbursement claims.',
      icon: 'solar:bill-list-bold-duotone',
      color: '#FF5630',
    },
    /*
    {
      label: 'Task Manager Mail',
      fieldname: 'task_notification',
      description: 'Get notified about task assignments, updates, and deadlines.',
      icon: 'solar:checklist-minimalistic-bold-duotone',
      color: '#08a3cd',
    },
    */
    {
      label: 'Job Application Mail',
      fieldname: 'job_notification',
      description: 'Get notified when a new job application is submitted.',
      icon: 'solar:bag-bold-duotone',
      color: '#8E33FF',
    },
  ];

  return (
    <Card sx={{ p: 3 }}>
      <Typography variant="h6" sx={{ mb: 3 }}>
        Mail Notification Settings
      </Typography>

      <Stack spacing={3}>
        {NOTIFICATIONS.map((item) => (
          <Stack
            key={item.fieldname}
            direction="row"
            alignItems="center"
            spacing={2}
            sx={{
              p: 2,
              borderRadius: 1.5,
              border: (theme) => `solid 1px ${theme.palette.divider}`,
              transition: (theme) => theme.transitions.create(['all']),
              '&:hover': {
                bgcolor: 'background.neutral',
              },
            }}
          >
            <Box
              sx={{
                width: 48,
                height: 48,
                display: 'flex',
                borderRadius: 1.5,
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: (theme) => (theme.palette.mode === 'light' ? `${item.color}14` : `${item.color}29`),
                color: item.color,
              }}
            >
              <Iconify icon={item.icon as any} width={28} />
            </Box>

            <ListItemText
              primary={item.label}
              secondary={item.description}
              primaryTypographyProps={{ variant: 'subtitle1', fontWeight: 'fontWeightBold' }}
              secondaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }}
            />

            <CustomSwitch
              checked={Boolean(data?.[item.fieldname])}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => onChange(item.fieldname, event.target.checked ? 1 : 0)}
            />
          </Stack>
        ))}
      </Stack>
    </Card>
  );
}
