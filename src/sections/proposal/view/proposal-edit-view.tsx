import dayjs from 'dayjs';
import { useSnackbar } from 'notistack';
import { useParams } from 'react-router-dom';
import { FaFileUpload } from "react-icons/fa";
import { IoMdArrowBack } from 'react-icons/io';
import { RiUploadCloud2Line } from "react-icons/ri";
import { useState, useEffect, useRef } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Dialog from '@mui/material/Dialog';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import { alpha } from '@mui/material/styles';
import TableRow from '@mui/material/TableRow';
import MenuItem from '@mui/material/MenuItem';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import Autocomplete from '@mui/material/Autocomplete';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TableContainer from '@mui/material/TableContainer';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import CircularProgress from '@mui/material/CircularProgress';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

import { useRouter } from 'src/routes/hooks';

import { uploadFile } from 'src/api/data-import';
import { getDoctypeList, getLead } from 'src/api/leads';
import { DashboardContent } from 'src/layouts/dashboard';
import { getProposal, createProposal } from 'src/api/proposal';

import { Iconify } from 'src/components/iconify';
import { RichTextEditor } from 'src/components/rich-text-editor/rich-text-editor';

// ----------------------------------------------------------------------

const STATUS_OPTIONS = ['Draft', 'Sent', 'Approved', 'Rejected', 'Expired'];

type AttachmentRow = {
    name?: string;
    attachment: string | null;
    description: string;
    file_name: string;
    file_size: string;
    uploaded_on: string;
    uploaded_by: string;
    _localFile?: File;
    _preview?: string;
};

function mapToAttachmentRow(item: any): AttachmentRow {
    return {
        name: item.name,
        attachment: item.attachment || null,
        description: item.description || '',
        file_name: item.file_name || '',
        file_size: item.file_size || '',
        uploaded_on: item.uploaded_on || '',
        uploaded_by: item.uploaded_by || '',
    };
}

function createEmptyAttachment(): AttachmentRow {
    return {
        attachment: null,
        description: '',
        file_name: '',
        file_size: '',
        uploaded_on: '',
        uploaded_by: '',
    };
}

// ----------------------------------------------------------------------

export function ProposalEditView() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const { enqueueSnackbar } = useSnackbar();

    const [initialLoading, setInitialLoading] = useState(true);

    // Form state
    const [proposalTitle, setProposalTitle] = useState('');
    const [referenceNo, setReferenceNo] = useState('');
    const [clientName, setClientName] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [billingName, setBillingName] = useState('');
    const [billingNameOptions, setBillingNameOptions] = useState<
        { name: string; account_name: string }[]
    >([]);
    const [prospect, setProspect] = useState('');
    const [proposalDate, setProposalDate] = useState('');
    const [validUntil, setValidUntil] = useState('');
    const [subject, setSubject] = useState('');
    const [description, setDescription] = useState('');
    const [termsAndConditions, setTermsAndConditions] = useState('');
    const [status, setStatus] = useState('Draft');
    const [attachments, setAttachments] = useState<AttachmentRow[]>([]);
    const [previewAttachment, setPreviewAttachment] = useState<AttachmentRow | null>(null);

    // Options
    const [customerOptions, setCustomerOptions] = useState<any[]>([]);
    const [prospectOptions, setProspectOptions] = useState<any[]>([]);

    // Loading
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);

    // Validation
    const [titleError, setTitleError] = useState(false);
    const [clientError, setClientError] = useState(false);

    const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        const loadAll = async () => {
            try {
                const [contacts, prospects] = await Promise.all([
                    getDoctypeList('Lead', ['name', 'lead_name', 'company_name']),
                    getDoctypeList('Deal', ['name', 'deal_title']),
                ]);
                setCustomerOptions(contacts);
                setProspectOptions(prospects);

                if (id) {
                    const proposal = await getProposal(decodeURIComponent(id));
                    setProposalTitle(proposal.proposal_title || '');
                    setReferenceNo(proposal.reference_no || '');
                    setClientName(proposal.lead || '');
                    setCustomerName(proposal.lead_name || '');
                    setBillingName(proposal.company_name || '');
                    setProspect(proposal.prospect || '');
                    setProposalDate(proposal.proposal_date || '');
                    setValidUntil(proposal.valid_until || '');
                    setSubject(proposal.subject || '');
                    setDescription(proposal.description || '');
                    setTermsAndConditions(proposal.terms_and_conditions || '');
                    setStatus(proposal.status || 'Draft');
                    setAttachments(
                        (proposal.attachments_table || []).map(mapToAttachmentRow)
                    );

                    // Load billing options for the existing client
                    if (proposal.lead) {
                        try {
                            const leadData = await getLead(proposal.lead);
                            const compName = leadData?.company_name || leadData?.company || '';
                            if (compName) {
                                setBillingNameOptions([{ name: compName, account_name: compName }]);
                            }
                        } catch (err) {
                            console.error('Failed to load billing options:', err);
                        }
                    }
                }
            } catch (err) {
                console.error('Failed to load proposal:', err);
                enqueueSnackbar('Failed to load proposal data', { variant: 'error' });
            } finally {
                setInitialLoading(false);
            }
        };
        loadAll();
    }, [id]);

    const handleCustomerChange = async (name: string, opt?: any) => {
        setClientName(name);
        setClientError(false);
        if (name) {
            try {
                let leadDetails = opt;
                if (!leadDetails || (!leadDetails.lead_name && !leadDetails.company_name)) {
                    leadDetails = await getLead(name);
                }
                
                const autoCustomerName = leadDetails?.lead_name || leadDetails?.customer_name || leadDetails?.title || '';
                setCustomerName(autoCustomerName);
                
                const compName = leadDetails?.company_name || leadDetails?.company || '';
                
                if (compName) {
                    setBillingNameOptions([{ name: compName, account_name: compName }]);
                    setBillingName(compName);
                } else {
                    setBillingNameOptions([]);
                    setBillingName('');
                }
            } catch (err) {
                console.error('Failed to fetch contact:', err);
            }
        } else {
            setCustomerName('');
            setBillingName('');
            setBillingNameOptions([]);
        }
    };

    const handleAddAttachmentRow = () => {
        setAttachments((prev) => [...prev, createEmptyAttachment()]);
    };

    const handleRemoveAttachmentRow = (index: number) => {
        setAttachments((prev) => prev.filter((_, i) => i !== index));
    };

    const handleFileSelect = (index: number, file: File) => {
        const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
        const sizeFmt =
            file.size < 1024
                ? `${file.size} B`
                : file.size < 1024 * 1024
                ? `${(file.size / 1024).toFixed(1)} KB`
                : `${(file.size / (1024 * 1024)).toFixed(1)} MB`;

        setAttachments((prev) => {
            const updated = [...prev];
            updated[index] = {
                ...updated[index],
                _localFile: file,
                _preview: URL.createObjectURL(file),
                file_name: file.name,
                file_size: sizeFmt,
                uploaded_on: now,
                attachment: file.name,
            };
            return updated;
        });
    };

    const handlePreviewAttachment = (row: AttachmentRow) => {
        setPreviewAttachment(row);
    };

    const handleClosePreview = () => {
        setPreviewAttachment(null);
    };

    const handleOpenFile = () => {
        if (!previewAttachment) return;
        if (previewAttachment._preview) {
            window.open(previewAttachment._preview, '_blank');
        } else if (typeof previewAttachment.attachment === 'string' && previewAttachment.attachment) {
            window.open(previewAttachment.attachment, '_blank');
        }
    };

    const handleDownloadAttachment = (row: AttachmentRow) => {
        if (row._localFile) {
            const url = URL.createObjectURL(row._localFile);
            const a = document.createElement('a');
            a.href = url;
            a.download = row.file_name;
            a.click();
            URL.revokeObjectURL(url);
        } else if (row.attachment) {
            const a = document.createElement('a');
            a.href = row.attachment;
            a.download = row.file_name || 'attachment';
            a.click();
        }
    };

    const handleSave = async () => {
        let hasError = false;
        if (!proposalTitle.trim()) { setTitleError(true); hasError = true; }
        if (!clientName) { setClientError(true); hasError = true; }
        if (hasError) {
            enqueueSnackbar('Please fill all required fields', { variant: 'error' });
            return;
        }

        try {
            setLoading(true);

            const uploadedAttachments: any[] = [];
            for (const row of attachments) {
                if (row._localFile) {
                    setUploading(true);
                    try {
                        const uploaded = await uploadFile(row._localFile);
                        uploadedAttachments.push({
                            attachment: uploaded.file_url,
                            description: row.description,
                            file_name: row.file_name,
                            file_size: row.file_size,
                            uploaded_on: row.uploaded_on,
                            uploaded_by: row.uploaded_by,
                        });
                    } finally { setUploading(false); }
                } else if (row.attachment) {
                    uploadedAttachments.push({
                        name: row.name,
                        attachment: row.attachment,
                        description: row.description,
                        file_name: row.file_name,
                        file_size: row.file_size,
                        uploaded_on: row.uploaded_on,
                        uploaded_by: row.uploaded_by,
                    });
                }
            }

            const payload: any = {
                proposal_title: proposalTitle,
                lead: clientName,
                lead_name: customerName,
                company_name: billingName || undefined,
                prospect: prospect || undefined,
                proposal_date: proposalDate,
                valid_until: validUntil || undefined,
                subject: subject || undefined,
                description: description || undefined,
                terms_and_conditions: termsAndConditions || undefined,
                status,
                attachments_table: uploadedAttachments,
            };

            const decodedId = decodeURIComponent(id || '');
            let mergedDoc: any = {};
            try {
                const latestDoc = await getProposal(decodedId);
                mergedDoc = { ...latestDoc, ...payload, doctype: 'Proposal' };
            } catch (err) {
                throw new Error('Failed to fetch latest proposal data before updating.');
            }

            const { frappeRequest, getAuthHeaders } = await import('src/utils/csrf');
            const headers = await getAuthHeaders();
            const res = await frappeRequest('/api/method/frappe.client.save', {
                method: 'POST',
                headers,
                body: JSON.stringify({ doc: mergedDoc }),
            });
            
            if (!res.ok) {
                const j = await res.json();
                if (j.exc_type === 'TimestampMismatchError' || j.exc?.includes('TimestampMismatchError')) {
                    throw new Error('This proposal was updated recently. Please refresh and try again.');
                }
                throw new Error(j.exc_type || 'Failed to update proposal');
            }

            enqueueSnackbar('Proposal updated successfully', { variant: 'success' });
            setTimeout(
                () =>
                    router.push(`/proposals/${encodeURIComponent(decodeURIComponent(id || ''))}/view`),
                1200
            );
        } catch (err: any) {
            enqueueSnackbar(err.message || 'Failed to update proposal', { variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    if (initialLoading) {
        return (
            <DashboardContent
                sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh' }}
            >
                <CircularProgress />
            </DashboardContent>
        );
    }

    return (
        <DashboardContent maxWidth="xl">
            {/* Header */}
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={5} mt={3}>
                <Stack spacing={0.5}>
                    <Typography variant="h4" sx={{ fontWeight: 800 }}>
                        Edit Proposal : {referenceNo}
                    </Typography>
                </Stack>
                <Stack direction="row" spacing={2}>
                    <Button
                        variant="outlined"
                        color="inherit"
                        onClick={() => router.push('/proposals')}
                        startIcon={<IoMdArrowBack size={20} />}
                        sx={{ borderRadius: 1.5, fontWeight: 600, textTransform: 'none', px: 2.5 }}
                    >
                        Go Back
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleSave}
                        disabled={loading || uploading}
                        sx={{ borderRadius: 1.5, bgcolor: '#059669', color: 'common.white', '&:hover': { bgcolor: '#047857' } }}
                    >
                        {loading ? <CircularProgress size={20} color="inherit" /> : 'Update Proposal'}
                    </Button>
                </Stack>
            </Stack>

            <LocalizationProvider dateAdapter={AdapterDayjs}>
                {/* Main Details Card */}
                <Card sx={{ p: 4, mb: 3, pt: 5 }}>
                    <Box sx={{ display: 'grid', columnGap: 3, rowGap: 3, gridTemplateColumns: { xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)' } }}>
                        <TextField fullWidth label="Proposal Title" required value={proposalTitle}
                            onChange={(e) => { setProposalTitle(e.target.value); if (e.target.value) setTitleError(false); }}
                            error={titleError} helperText={titleError ? 'Proposal title is required' : ''}
                            sx={{ gridColumn: { sm: 'span 2' } }} />

                        <Autocomplete fullWidth options={customerOptions}
                            getOptionLabel={(opt) => opt.lead_name ? `${opt.lead_name} (${opt.name})` : opt.name || ''}
                            value={customerOptions.find((o) => o.name === clientName) || null}
                            onChange={(_e, val) => handleCustomerChange(val?.name || '', val)}
                            renderInput={(params) => (
                                <TextField {...params} label="Lead" required error={clientError}
                                    helperText={clientError ? 'Please select a lead' : ''} />
                            )}
                            renderOption={(props, option) => (
                                <li {...props} key={option.name}>
                                    <Stack spacing={0.5} sx={{ py: 0.5 }}>
                                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                            {option.lead_name || option.name}
                                        </Typography>
                                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                            ID: {option.name}
                                        </Typography>
                                    </Stack>
                                </li>
                            )}
                        />

                        <TextField fullWidth label="Lead Name" value={customerName}
                            slotProps={{ input: { readOnly: true } }}
                            sx={{ bgcolor: (t) => alpha(t.palette.grey[500], 0.05) }} />

                        <TextField fullWidth label="Company Name" value={billingName}
                            slotProps={{ input: { readOnly: true } }}
                            sx={{ bgcolor: (t) => alpha(t.palette.grey[500], 0.05) }} />

                        <DatePicker label="Proposal Date *"
                            value={proposalDate ? dayjs(proposalDate) : null}
                            onChange={(val) => setProposalDate(val?.format('YYYY-MM-DD') || '')}
                            slotProps={{ textField: { fullWidth: true, InputLabelProps: { shrink: true } } }} />

                        <DatePicker label="Valid Until"
                            value={validUntil ? dayjs(validUntil) : null}
                            onChange={(val) => setValidUntil(val?.format('YYYY-MM-DD') || '')}
                            slotProps={{ textField: { fullWidth: true, InputLabelProps: { shrink: true } }, field: { clearable: true, onClear: () => setValidUntil('') } }} />

                        {/* <TextField fullWidth label="Status" select value={status} onChange={(e) => setStatus(e.target.value)}>
                            {STATUS_OPTIONS.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                        </TextField> */}

                        {/* Description */}
                        <Box sx={{ gridColumn: { sm: 'span 2' } }}>
                            <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary', mb: 1 }}>
                                Description
                            </Typography>
                            <RichTextEditor
                                value={description}
                                onChange={(val: string) => setDescription(val)}
                                placeholder="Enter proposal description..."
                            />
                        </Box>
                        
                        <Box sx={{ gridColumn: { sm: 'span 2' } }}>
                            <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary', mb: 1 }}>
                                Terms and Conditions
                            </Typography>
                            <RichTextEditor
                                value={termsAndConditions}
                                onChange={(val: string) => setTermsAndConditions(val)}
                                placeholder="Enter terms and conditions for this proposal..."
                            />
                        </Box>
                    </Box>
                </Card>

                {/* Attachments */}
                <Card sx={{ p: 4, mb: 3 }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', fontSize: 14 }}>
                            Attachments ({attachments.filter((a) => a.attachment).length})
                        </Typography>
                        <Button variant="contained" size="small" startIcon={<Iconify icon="mingcute:add-line" />}
                            onClick={handleAddAttachmentRow} 
                            sx={{
                                borderRadius: 1,
                                bgcolor: '#059669',
                                color: 'common.white',
                                '&:hover': { bgcolor: '#047857' },
                            }}>
                            Add Row
                        </Button>
                    </Stack>

                    <TableContainer sx={{ border: (t) => `1px solid ${t.palette.divider}`, borderRadius: 1.5 }}>
                        <Table sx={{ minWidth: 800 }}>
                            <TableHead sx={{ bgcolor: (t) => alpha(t.palette.grey[500], 0.08), '& th': { fontWeight: 700, fontSize: 13 } }}>
                                <TableRow>
                                    <TableCell width={40} align="center">S.No</TableCell>
                                    <TableCell>Attachment</TableCell>
                                    <TableCell>Description</TableCell>
                                    <TableCell>File Name</TableCell>
                                    <TableCell>File Size</TableCell>
                                    <TableCell>Uploaded On</TableCell>
                                    <TableCell>Uploaded By</TableCell>
                                    <TableCell align="center">Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {attachments.map((row, index) => (
                                    <TableRow key={index} sx={{ '&:hover': { bgcolor: (t) => alpha(t.palette.primary.main, 0.02) } }}>
                                        <TableCell align="center">
                                            <Box sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: (t) => alpha(t.palette.primary.main, 0.1), color: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, mx: 'auto' }}>
                                                {index + 1}
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <input type="file" style={{ display: 'none' }}
                                                ref={(el) => { fileInputRefs.current[index] = el; }}
                                                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(index, f); e.target.value = ''; }} />
                                            {row.attachment ? (
                                                <Stack direction="row" alignItems="center" spacing={1}>
                                                    <Chip
                                                        label={row.file_name || 'File'}
                                                        size="small"
                                                        icon={<FaFileUpload size={13} />}
                                                        sx={{
                                                            maxWidth: 150,
                                                            bgcolor: '#22c55e',
                                                            color: '#ffffff',
                                                            fontWeight: 600,
                                                            '& .MuiChip-icon': {
                                                                color: '#ffffff',
                                                                ml: 0.5,
                                                            },
                                                            p: 1
                                                        }}
                                                    />
                                                    <IconButton size="small" onClick={() => fileInputRefs.current[index]?.click()} title="Change file">
                                                        <Iconify icon="solar:refresh-bold" width={16} />
                                                    </IconButton>
                                                </Stack>
                                            ) : (
                                                <Button size="small" variant="contained" startIcon={<RiUploadCloud2Line />}
                                                    onClick={() => fileInputRefs.current[index]?.click()} 
                                                    sx={{ 
                                                        borderRadius: 1.5,
                                                        fontWeight: 600,
                                                        textTransform: 'none',
                                                        bgcolor: '#36b37e',
                                                        color: 'common.white',
                                                        '&:hover': { bgcolor: '#2b9065' }
                                                    }}>
                                                    Upload File
                                                </Button>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <TextField size="small" placeholder="Description..." value={row.description}
                                                onChange={(e) => { const updated = [...attachments]; updated[index].description = e.target.value; setAttachments(updated); }}
                                                variant="standard" InputProps={{ disableUnderline: true, sx: { fontSize: 13 } }} fullWidth />
                                        </TableCell>
                                        <TableCell><Typography variant="body2" sx={{ color: 'text.secondary', fontSize: 14 }}>{row.file_name || '—'}</Typography></TableCell>
                                        <TableCell><Typography variant="body2" sx={{ color: 'text.secondary', fontSize: 14 }}>{row.file_size || '—'}</Typography></TableCell>
                                        <TableCell><Typography variant="body2" sx={{ color: 'text.secondary', fontSize: 14 }}>{row.uploaded_on || '—'}</Typography></TableCell>
                                        <TableCell><Typography variant="body2" sx={{ color: 'text.secondary', fontSize: 14 }}>{row.uploaded_by || '—'}</Typography></TableCell>
                                        <TableCell align="center">
                                            <Stack direction="row" spacing={0.5} justifyContent="center">
                                                <IconButton size="small" onClick={() => handlePreviewAttachment(row)} sx={{ color: 'info.main' }} disabled={!row.attachment} title="Preview"><Iconify icon="solar:eye-bold" width={18} /></IconButton>
                                                <IconButton size="small" onClick={() => handleDownloadAttachment(row)} sx={{ color: 'success.main' }} disabled={!row.attachment} title="Download"><Iconify icon="solar:download-bold" width={18} /></IconButton>
                                                <IconButton size="small" onClick={() => handleRemoveAttachmentRow(index)} sx={{ color: 'error.main' }} title="Delete row"><Iconify icon="solar:trash-bin-trash-bold" width={18} /></IconButton>
                                            </Stack>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {attachments.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                                            <Typography variant="body2" sx={{ color: 'text.disabled' }}>No attachments. Click &quot;Add Row&quot; to start.</Typography>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Card>
            </LocalizationProvider>

            {/* Preview Dialog */}
            <Dialog 
                open={!!previewAttachment} 
                onClose={handleClosePreview} 
                maxWidth="sm" 
                fullWidth 
                PaperProps={{ sx: { borderRadius: 2 } }}
            >
                <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>Attachment Details</Typography>
                    <IconButton
                        onClick={handleClosePreview}
                        sx={{
                            color: (theme) => theme.palette.grey[500],
                            bgcolor: 'background.paper',
                            '&:hover': { bgcolor: 'background.default' },
                        }}
                    >
                        <Iconify icon="mingcute:close-line" />
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers sx={{ px: 3, pb: 4, pt: 3 }}>
                    {previewAttachment && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {/* Document Info Card */}
                            <Box sx={{ p: 2.5, borderRadius: 2, bgcolor: (t) => alpha(t.palette.grey[500], 0.04), border: (t) => `1px dashed ${alpha(t.palette.grey[500], 0.2)}` }}>
                                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 3 }}>
                                    <Box>
                                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5, textTransform: 'uppercase', fontWeight: 600 }}>
                                            <Iconify icon="solar:document-bold" width={14} />
                                            File Name
                                        </Typography>
                                        <Typography variant="subtitle2" sx={{ wordBreak: 'break-all' }}>{previewAttachment.file_name || '—'}</Typography>
                                    </Box>
                                    
                                    <Box>
                                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5, textTransform: 'uppercase', fontWeight: 600 }}>
                                            <Iconify icon={"solar:diskette-bold" as any} width={14} />
                                            File Size
                                        </Typography>
                                        <Typography variant="subtitle2">{previewAttachment.file_size || '—'}</Typography>
                                    </Box>
                                </Box>
                                
                                <Divider sx={{ my: 2, borderStyle: 'dashed' }} />
                                
                                <Box>
                                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5, textTransform: 'uppercase', fontWeight: 600 }}>
                                        <Iconify icon="solar:notes-bold" width={14} />
                                        Description
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: previewAttachment.description ? 'text.primary' : 'text.disabled' }}>
                                        {previewAttachment.description || 'No description provided.'}
                                    </Typography>
                                </Box>
                            </Box>
                            
                            {/* Meta Info */}
                            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2, px: 1 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                    <Box sx={{ width: 32, height: 32, borderRadius: '50%', bgcolor: (t) => alpha(t.palette.success.main, 0.1), color: 'success.main', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Iconify icon="solar:calendar-date-bold" width={16} />
                                    </Box>
                                    <Box>
                                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>Uploaded On</Typography>
                                        <Typography variant="subtitle2" sx={{ fontSize: 13 }}>{previewAttachment.uploaded_on || '—'}</Typography>
                                    </Box>
                                </Box>
                                
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                    <Box sx={{ width: 32, height: 32, borderRadius: '50%', bgcolor: (t) => alpha(t.palette.warning.main, 0.1), color: 'warning.main', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Iconify icon={"solar:user-circle-bold" as any} width={16} />
                                    </Box>
                                    <Box>
                                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>Uploaded By</Typography>
                                        <Typography variant="subtitle2" sx={{ fontSize: 13 }}>{previewAttachment.uploaded_by || '—'}</Typography>
                                    </Box>
                                </Box>
                            </Box>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ m: 1 }}>
                    <Button
                        onClick={handleOpenFile}
                        variant="contained"
                        disabled={!previewAttachment?.attachment && !previewAttachment?._preview}
                        startIcon={<Iconify icon="solar:eye-bold" />}
                    >
                        View File
                    </Button>
                </DialogActions>
            </Dialog>
        </DashboardContent>
    );
}
