import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import { alpha } from '@mui/material/styles';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';

import { getToDo } from 'src/api/todo';
import { getCall } from 'src/api/calls';
import { getLead } from 'src/api/leads';
import { getEvent } from 'src/api/events';
import { getAccount } from 'src/api/accounts';
import { getContact } from 'src/api/contacts';
import { getMeeting } from 'src/api/meetings';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

import { LeadDetailsDialog } from 'src/sections/report/lead-details-dialog';
import { CallDetailsDialog } from 'src/sections/report/calls/call-details-dialog';
import { AccountDetailsDialog } from 'src/sections/report/account/account-details-dialog';
import { ContactDetailsDialog } from 'src/sections/report/contact/contact-details-dialog';
import { MeetingDetailsDialog } from 'src/sections/report/meeting/meeting-details-dialog';

// ----------------------------------------------------------------------

type Props = {
    open: boolean;
    onClose: () => void;
    eventId: string | null;
    eventRefName?: string | null;
    eventRefType?: string | null;
    initialOpenClientDetails?: boolean;
    initialClientTab?: string;
    initialContactId?: string | null;
};

export function EventDetailsDialog({
    open,
    onClose,
    eventId,
    eventRefName,
    eventRefType,
    initialOpenClientDetails,
    initialClientTab,
    initialContactId
}: Props) {
    const [event, setEvent] = useState<any>(null);
    const [leadData, setLeadData] = useState<any>(null);
    const [clientData, setClientData] = useState<any>(null);
    const [companyData, setCompanyData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [openLeadDetails, setOpenLeadDetails] = useState(false);
    const [openClientDetails, setOpenClientDetails] = useState(Boolean(initialOpenClientDetails));
    const [openCompanyDetails, setOpenCompanyDetails] = useState(false);

    useEffect(() => {
        if (open && initialOpenClientDetails) {
            setOpenClientDetails(true);
        }
    }, [open, initialOpenClientDetails]);

    useEffect(() => {
        async function fetchDetails() {
            if (!open || !eventId) return;
            setLoading(true);
            try {
                // Fetch basic event details
                const fetchedEvent = await getEvent(eventId);
                setEvent(fetchedEvent);

                // Determine if there is an associated lead, client, or company ID
                let resolvedLeadId: string | null = null;
                let resolvedClientId: string | null = null;
                let resolvedCompanyId: string | null = null;
                const refType = eventRefType || fetchedEvent.reference_doctype;
                const refName = eventRefName || fetchedEvent.reference_docname;

                if (refName) {
                    if (refType === 'Lead') {
                        resolvedLeadId = refName;
                    } else if (refType === 'Contact') {
                        resolvedClientId = refName;
                    } else if (refType === 'Accounts') {
                        resolvedCompanyId = refName;
                    } else if (refType === 'Calls') {
                        const call = await getCall(refName);
                        if (call) {
                            if (call.call_for === 'Lead' && call.lead_name) {
                                resolvedLeadId = call.lead_name;
                            } else if (call.call_for === 'Contact' && call.contact_name) {
                                resolvedClientId = call.contact_name;
                            } else if (call.call_for === 'Accounts' && call.account_name) {
                                resolvedCompanyId = call.account_name;
                            }
                        }
                    } else if (refType === 'Meeting') {
                        const meeting = await getMeeting(refName);
                        if (meeting) {
                            if (meeting.meet_for === 'Lead' && meeting.lead_name) {
                                resolvedLeadId = meeting.lead_name;
                            } else if (meeting.meet_for === 'Contact' && meeting.contact_name) {
                                resolvedClientId = meeting.contact_name;
                            } else if (meeting.meet_for === 'Accounts' && meeting.accounts_name) {
                                resolvedCompanyId = meeting.accounts_name;
                            }
                        }
                    } else if (refType === 'ToDo') {
                        const todo = await getToDo(refName);
                        if (todo) {
                            if (todo.reference_type === 'Lead' && todo.reference_name) {
                                resolvedLeadId = todo.reference_name;
                            } else if (todo.reference_type === 'Contact' && todo.reference_name) {
                                resolvedClientId = todo.reference_name;
                            } else if (todo.reference_type === 'Accounts' && todo.reference_name) {
                                resolvedCompanyId = todo.reference_name;
                            }
                        }
                    }
                }

                // Fetch Lead
                if (resolvedLeadId) {
                    const lead = await getLead(resolvedLeadId);
                    setLeadData(lead);
                } else {
                    setLeadData(null);
                }

                // Fetch Client
                if (resolvedClientId) {
                    const contact = await getContact(resolvedClientId);
                    setClientData(contact);
                } else {
                    setClientData(null);
                }

                // Fetch Company
                if (resolvedCompanyId) {
                    const account = await getAccount(resolvedCompanyId);
                    setCompanyData(account);
                } else {
                    setCompanyData(null);
                }
            } catch (err) {
                console.error('Failed to load event details:', err);
            } finally {
                setLoading(false);
            }
        }

        fetchDetails();
    }, [open, eventId, eventRefName, eventRefType]);

    const handleClose = () => {
        setEvent(null);
        setLeadData(null);
        setClientData(null);
        setCompanyData(null);
        onClose();
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Completed': return 'success';
            case 'Closed': return 'success';
            case 'Scheduled': return 'info';
            case 'Open': return 'info';
            case 'Overdue': return 'error';
            case 'Cancelled': return 'warning';
            default: return 'default';
        }
    };

    const renderStatus = (status: string) => (
        <Label
            variant="soft"
            color={getStatusColor(status)}
            sx={{ textTransform: 'uppercase', fontWeight: 800 }}
        >
            {status}
        </Label>
    );

    const resolvedType = eventRefType || (event ? event.reference_doctype : null);
    const resolvedName = eventRefName || (event ? event.reference_docname : null);

    if (resolvedType === 'Calls') {
        return (
            <CallDetailsDialog
                open={open}
                onClose={handleClose}
                callId={resolvedName}
                eventId={eventId}
                initialOpenClientDetails={initialOpenClientDetails}
                initialClientTab={initialClientTab}
                initialContactId={initialContactId}
            />
        );
    }

    if (resolvedType === 'Meeting') {
        return (
            <MeetingDetailsDialog
                open={open}
                onClose={handleClose}
                meetingId={resolvedName}
                eventId={eventId}
                initialOpenClientDetails={initialOpenClientDetails}
                initialClientTab={initialClientTab}
                initialContactId={initialContactId}
            />
        );
    }

    return (
        <>
            <Dialog
                open={open}
                onClose={handleClose}
                fullWidth
                maxWidth="md"
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
                        Event Details
                    </Typography>
                    <IconButton
                        onClick={handleClose}
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
                            <Iconify icon="svg-spinners:12-dots-scale-rotate" width={40} sx={{ color: 'primary.main' }} />
                        </Box>
                    ) : event ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                            {/* Header Info */}
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                <Box
                                    sx={{
                                        width: 64,
                                        height: 64,
                                        borderRadius: 2,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        bgcolor: (theme) => alpha(theme.palette.info.main, 0.08),
                                        color: 'info.main',
                                        flexShrink: 0,
                                    }}
                                >
                                    <Iconify icon="solar:calendar-date-bold" width={32} />
                                </Box>
                                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                                    <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.5 }}>
                                        {event.subject}
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                                        Type: {event.event_category || event.event_type || 'Event'}
                                    </Typography>
                                </Box>
                                <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                                    {renderStatus(event.status || 'Open')}
                                    <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.disabled', fontWeight: 700 }}>
                                        ID: {event.name}
                                    </Typography>
                                </Box>
                            </Box>

                            <Divider sx={{ borderStyle: 'dashed' }} />

                            {/* General Information */}
                            <Box>
                                <SectionHeader title="Event Information" />
                                <Box
                                    sx={{
                                        display: 'grid',
                                        gap: 2,
                                        gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                                    }}
                                >
                                    <Box sx={{ p: 3, bgcolor: 'background.neutral', borderRadius: 2, gridColumn: '1 / -1' }}>
                                        <DetailItem label="Event Title" value={event.subject} fullWidth />
                                    </Box>
                                    <DetailItem label="Event Type" value={event.event_category || event.event_type || 'Event'} icon="solar:tag-bold" />
                                    <DetailItem label="Status" value={event.status || 'Open'} icon="solar:flag-bold" />
                                    <DetailItem label="Start Date & Time" value={event.starts_on ? new Date(event.starts_on).toLocaleString() : '-'} icon="solar:clock-circle-bold" />
                                    <DetailItem label="End Date & Time" value={event.ends_on ? new Date(event.ends_on).toLocaleString() : '-'} icon="solar:clock-circle-bold" />
                                    <DetailItem label="Owner" value={event.owner} icon="solar:user-rounded-bold" />
                                </Box>
                            </Box>

                            {/* Lead Information */}
                            {leadData && (
                                <>
                                    <Divider sx={{ borderStyle: 'dashed' }} />
                                    <Box>
                                        <SectionHeader title="Lead" />
                                        <Box
                                            sx={{
                                                p: 3,
                                                bgcolor: 'background.neutral',
                                                borderRadius: 2,
                                                position: 'relative',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: 1,
                                            }}
                                        >
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                                                    {leadData.lead_name}
                                                </Typography>
                                                <IconButton
                                                    size="small"
                                                    onClick={() => setOpenLeadDetails(true)}
                                                    sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' } }}
                                                >
                                                    <Iconify icon="solar:eye-bold" width={20} />
                                                </IconButton>
                                            </Box>
                                            <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                                                ID: {leadData.name}
                                            </Typography>
                                        </Box>
                                    </Box>
                                </>
                            )}

                            {/* Client Information */}
                            {clientData && (
                                <>
                                    <Divider sx={{ borderStyle: 'dashed' }} />
                                    <Box>
                                        <SectionHeader title="Client" />
                                        <Box
                                            sx={{
                                                p: 3,
                                                bgcolor: 'background.neutral',
                                                borderRadius: 2,
                                                position: 'relative',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: 1,
                                            }}
                                        >
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                                                    {clientData.first_name} {clientData.last_name || ''}
                                                </Typography>
                                                <IconButton
                                                    size="small"
                                                    onClick={() => setOpenClientDetails(true)}
                                                    sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' } }}
                                                >
                                                    <Iconify icon="solar:eye-bold" width={20} />
                                                </IconButton>
                                            </Box>
                                            <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                                                ID: {clientData.name}
                                            </Typography>
                                        </Box>
                                    </Box>
                                </>
                            )}

                            {/* Company Information */}
                            {companyData && (
                                <>
                                    <Divider sx={{ borderStyle: 'dashed' }} />
                                    <Box>
                                        <SectionHeader title="Company" />
                                        <Box
                                            sx={{
                                                p: 3,
                                                bgcolor: 'background.neutral',
                                                borderRadius: 2,
                                                position: 'relative',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: 1,
                                            }}
                                        >
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                                                    {companyData.account_name}
                                                </Typography>
                                                <IconButton
                                                    size="small"
                                                    onClick={() => setOpenCompanyDetails(true)}
                                                    sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' } }}
                                                >
                                                    <Iconify icon="solar:eye-bold" width={20} />
                                                </IconButton>
                                            </Box>
                                            <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                                                ID: {companyData.name}
                                            </Typography>
                                        </Box>
                                    </Box>
                                </>
                            )}

                            {/* Description / Notes */}
                            {event.description && (
                                <>
                                    <Divider sx={{ borderStyle: 'dashed' }} />
                                    <Box>
                                        <SectionHeader title="Description/Notes" />
                                        <Box sx={{ p: 3, bgcolor: 'background.neutral', borderRadius: 2 }}>
                                            <Typography
                                                variant="body2"
                                                sx={{ whiteSpace: 'pre-wrap', color: 'text.primary', fontWeight: 500 }}
                                                dangerouslySetInnerHTML={{ __html: event.description }}
                                            />
                                        </Box>
                                    </Box>
                                </>
                            )}

                            {/* System Information */}
                            <Box sx={{ p: 3, bgcolor: 'background.neutral', borderRadius: 2 }}>
                                <SectionHeader title="System Information" />
                                <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
                                    <DetailItem label="Created On" value={new Date(event.creation).toLocaleString()} icon="solar:calendar-date-bold" />
                                    <DetailItem label="Modified On" value={new Date(event.modified).toLocaleString()} icon="solar:calendar-minimalistic-bold" />
                                </Box>
                            </Box>
                        </Box>
                    ) : (
                        <Box sx={{ py: 10, textAlign: 'center' }}>
                            <Iconify icon="solar:ghost-bold" width={64} sx={{ color: 'text.disabled', mb: 2 }} />
                            <Typography variant="h6" sx={{ color: 'text.secondary' }}>No Details Found</Typography>
                        </Box>
                    )}
                </DialogContent>
            </Dialog>

            {leadData && (
                <LeadDetailsDialog
                    open={openLeadDetails}
                    onClose={() => setOpenLeadDetails(false)}
                    leadId={leadData.name}
                />
            )}

            {(clientData || initialContactId) && (
                <ContactDetailsDialog
                    open={openClientDetails}
                    onClose={() => setOpenClientDetails(false)}
                    contactId={clientData?.name || initialContactId}
                    initialTab={initialClientTab}
                    extraState={{
                        eventId: eventId || undefined,
                        eventRefType: resolvedType,
                        eventRefName: resolvedName,
                    }}
                />
            )}

            {companyData && (
                <AccountDetailsDialog
                    open={openCompanyDetails}
                    onClose={() => setOpenCompanyDetails(false)}
                    accountId={companyData.name}
                />
            )}
        </>
    );
}

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
    fullWidth = false,
}: {
    label: string;
    value?: string | null;
    icon?: string;
    fullWidth?: boolean;
}) {
    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                ...(fullWidth && { gridColumn: '1 / -1' }),
            }}
        >
            {icon && (
                <Box
                    sx={{
                        width: 44,
                        height: 44,
                        borderRadius: 1.25,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: (theme) => alpha(theme.palette.info.main, 0.08),
                        color: 'info.main',
                        flexShrink: 0,
                    }}
                >
                    <Iconify icon={icon as any} width={22} />
                </Box>
            )}
            <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0, flexGrow: 1 }}>
                <Typography
                    variant="caption"
                    sx={{
                        color: 'text.secondary',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                        display: 'block',
                        mb: 0.25,
                    }}
                >
                    {label}
                </Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    {value || '-'}
                </Typography>
            </Box>
        </Box>
    );
}
