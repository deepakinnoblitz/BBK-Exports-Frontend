import { useSnackbar } from 'notistack';
import { useState, useEffect } from 'react';
import { IoMdArrowBack } from 'react-icons/io';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Select from '@mui/material/Select';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import InputLabel from '@mui/material/InputLabel';
import IconButton from '@mui/material/IconButton';
import LoadingButton from '@mui/lab/LoadingButton';
import FormControl from '@mui/material/FormControl';
import DialogTitle from '@mui/material/DialogTitle';
import { alpha, styled } from '@mui/material/styles';
import Autocomplete from '@mui/material/Autocomplete';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TableContainer from '@mui/material/TableContainer';
import FormHelperText from '@mui/material/FormHelperText';
import Switch, { SwitchProps } from '@mui/material/Switch';
import CircularProgress from '@mui/material/CircularProgress';
import FormControlLabel from '@mui/material/FormControlLabel';

import { useRouter } from 'src/routes/hooks';

import { fetchMetaPages } from 'src/api/meta-page';
import { DashboardContent } from 'src/layouts/dashboard';
import { getDoctypeList, createLeadFrom } from 'src/api/leads';
import { createMetaForm, getLeadFields, getMandatoryLeadFields } from 'src/api/meta-form';

import { Iconify } from 'src/components/iconify';

export const CustomSwitch = styled((props: SwitchProps) => (
    <Switch focusVisibleClassName=".Mui-focusVisible" disableRipple {...props} />
))(({ theme }) => ({
    width: 42,
    height: 24,
    padding: 0,
    '& .MuiSwitch-switchBase': {
        padding: 0,
        margin: 2,
        transitionDuration: '300ms',
        '&.Mui-checked': {
            transform: 'translateX(18px)',
            color: '#fff',
            '& + .MuiSwitch-track': {
                backgroundColor: '#059669',
                opacity: 1,
                border: 0,
            },
            '&.Mui-disabled + .MuiSwitch-track': {
                backgroundColor: '#059669',
                opacity: 1,
            },
        },
        '&.Mui-disabled': {
            color: '#fff',
            '& + .MuiSwitch-track': {
                opacity: 1,
            }
        }
    },
    '& .MuiSwitch-thumb': {
        boxSizing: 'border-box',
        width: 19,
        height: 19,
        boxShadow: '0 2px 4px 0 rgb(0 35 11 / 20%)',
    },
    '& .MuiSwitch-track': {
        borderRadius: 26 / 2,
        backgroundColor: '#E5E7EB',
        opacity: 1,
        transition: theme.transitions.create(['background-color'], {
            duration: 500,
        }),
    },
}));

// Standard CRM Lead field options for dropdown selects
const CRM_FIELD_OPTIONS = [
    { value: 'lead_name', label: 'Lead Name' },
    { value: 'email', label: 'Email' },
    { value: 'phone_number', label: 'Phone Number' },
    { value: 'company_name', label: 'Company Name' },
    { value: 'city', label: 'City' },
    { value: 'state', label: 'State' },
    { value: 'country', label: 'Country' },
    { value: 'remarks', label: 'Remarks' },
    { value: 'gstin', label: 'GSTIN' },
    { value: 'service', label: 'Service' },
];

const TRANSFORM_OPTIONS = ['None', 'Title Case', 'Upper Case', 'Lower Case', 'Clean Phone'];

// ----------------------------------------------------------------------

export function MetaFormsCreateView() {
    const router = useRouter();
    const [isSaving, setIsSaving] = useState(false);

    const [formName, setFormName] = useState('');
    const [formId, setFormId] = useState('');
    const [metaPage, setMetaPage] = useState('');
    const [formStatus, setFormStatus] = useState('ACTIVE');
    const [locale, setLocale] = useState('');

    // Tracking detail fields
    const [campaignId, setCampaignId] = useState('');
    const [campaignName, setCampaignName] = useState('');
    const [adSetId, setAdSetId] = useState('');
    const [adSetName, setAdSetName] = useState('');
    const [adId, setAdId] = useState('');
    const [adName, setAdName] = useState('');

    // Settings
    const [isActive, setIsActive] = useState(true);
    const [allowDuplicates, setAllowDuplicates] = useState(false);
    const [duplicateLimitBy, setDuplicateLimitBy] = useState('Email or Phone');

    // Field Mappings Child Table
    const [fieldMappings, setFieldMappings] = useState<any[]>([]);

    const [metaPages, setMetaPages] = useState<any[]>([]);
    const [loadingPages, setLoadingPages] = useState(true);

    const [crmFieldOptions, setCrmFieldOptions] = useState<{ value: string; label: string }[]>([]);
    const [loadingFields, setLoadingFields] = useState(true);

    const [mandatoryFields, setMandatoryFields] = useState<{ fieldname: string; label: string }[]>([]);

    const [leadsFromOptions, setLeadsFromOptions] = useState<string[]>([]);

    const [createLeadFromOpen, setCreateLeadFromOpen] = useState(false);
    const [creatingLeadFrom, setCreatingLeadFrom] = useState(false);
    const [newLeadFromName, setNewLeadFromName] = useState('');
    const [newLeadFromIndex, setNewLeadFromIndex] = useState<number | null>(null);

    const { enqueueSnackbar } = useSnackbar();
    const [errors, setErrors] = useState<{ formName?: boolean; formId?: boolean; metaPage?: boolean }>({});

    const handleCreateLeadFromSubmit = async () => {
        if (!newLeadFromName.trim()) return;
        setCreatingLeadFrom(true);
        try {
            await createLeadFrom(newLeadFromName.trim());
            setLeadsFromOptions((prev) => [...prev, newLeadFromName.trim()]);
            if (newLeadFromIndex !== null) {
                handleMappingChange(newLeadFromIndex, 'default_value', newLeadFromName.trim());
            }
            setCreateLeadFromOpen(false);
            setNewLeadFromName('');
            enqueueSnackbar('Lead From created successfully', { variant: 'success' });
        } catch (error: any) {
            enqueueSnackbar(error?.message || 'Failed to create Lead From', { variant: 'error' });
        } finally {
            setCreatingLeadFrom(false);
        }
    };

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const [pagesRes, fieldsRes, mandatoryRes, leadFromRes] = await Promise.all([
                    fetchMetaPages({ page: 1, page_size: 1000 }),
                    getLeadFields(),
                    getMandatoryLeadFields(),
                    getDoctypeList('Lead From')
                ]);
                setMetaPages(pagesRes.data);
                setMandatoryFields(mandatoryRes || []);
                setLeadsFromOptions((leadFromRes || []).map((item: any) => item.name || item.label || String(item)));

                // Generate mandatory field entries automatically
                const defaultMetaKeys: Record<string, string> = {
                    lead_name: 'full_name',
                    email: 'email',
                    phone_number: 'phone_number',
                };
                const autoMappings = (mandatoryRes || []).map((field: any) => ({
                    meta_field: defaultMetaKeys[field.fieldname] || '',
                    crm_field: field.fieldname,
                    required: 1,
                    default_value: '',
                    transform_function: field.fieldname === 'phone_number' ? 'Clean Phone' : 'None',
                }));
                setFieldMappings(autoMappings);

                // Map API field format to option select values
                const mappedOptions = fieldsRes.map((f: any) => ({
                    value: f.fieldname,
                    label: f.label
                }));
                setCrmFieldOptions(mappedOptions.length ? mappedOptions : CRM_FIELD_OPTIONS);
            } catch (err) {
                enqueueSnackbar('Failed to load initial form metadata fields', { variant: 'error' });
            } finally {
                setLoadingPages(false);
                setLoadingFields(false);
            }
        };
        loadInitialData();
    }, [enqueueSnackbar]);

    const handleAddMappingRow = () => {
        const usedFields = fieldMappings.map((m) => m.crm_field);
        const optionsList = crmFieldOptions.length ? crmFieldOptions : CRM_FIELD_OPTIONS;
        const firstAvailable = optionsList.find(
            (opt) => opt.value === 'notes' || opt.value === 'remarks' || !usedFields.includes(opt.value)
        );
        const defaultCrmField = firstAvailable ? firstAvailable.value : '';

        setFieldMappings(prev => [
            ...prev,
            { meta_field: '', crm_field: defaultCrmField, required: 0, default_value: '', transform_function: 'None' }
        ]);
    };

    const handleRemoveMappingRow = (index: number) => {
        setFieldMappings(prev => prev.filter((_, idx) => idx !== index));
    };

    const handleMappingChange = (index: number, key: string, value: any) => {
        setFieldMappings(prev => {
            const copy = [...prev];
            const updatedRow = { ...copy[index], [key]: value };
            if (key === 'crm_field') {
                if (value === 'leads_type') {
                    updatedRow.default_value = 'Incoming';
                } else if (value === 'leads_from') {
                    updatedRow.default_value = '';
                }
            }
            copy[index] = updatedRow;
            return copy;
        });
    };

    const handleSave = async () => {
        const newErrors: typeof errors = {};
        if (!formName.trim()) newErrors.formName = true;
        if (!formId.trim()) newErrors.formId = true;
        if (!metaPage) newErrors.metaPage = true;

        setErrors(newErrors);
        if (Object.keys(newErrors).length > 0) {
            enqueueSnackbar('Please fill in all required fields.', { variant: 'error' });
            return;
        }

        // Validate field mapping list
        const processedMappings = fieldMappings.map(m => {
            const copy = { ...m };
            if (copy.crm_field === 'leads_type' && !copy.default_value) {
                copy.default_value = 'Incoming';
            }
            return copy;
        });

        const invalidMappings = processedMappings.some(m => 
            !m.crm_field || (!(m.meta_field || '').trim() && !(m.default_value || '').trim())
        );
        if (invalidMappings) {
            enqueueSnackbar('Please ensure all mapping rows have a CRM Field selected and either a Meta Field value or Default Value.', { variant: 'error' });
            return;
        }

        setIsSaving(true);
        try {
            await createMetaForm({
                form_name: formName.trim(),
                form_id: formId.trim(),
                meta_page: metaPage,
                form_status: (formStatus || '').trim() || undefined,
                locale: (locale || '').trim() || undefined,
                campaign_id: (campaignId || '').trim() || undefined,
                campaign_name: (campaignName || '').trim() || undefined,
                ad_set_id: (adSetId || '').trim() || undefined,
                ad_set_name: (adSetName || '').trim() || undefined,
                ad_id: (adId || '').trim() || undefined,
                ad_name: (adName || '').trim() || undefined,
                is_active: isActive ? 1 : 0,
                allow_duplicates: allowDuplicates ? 1 : 0,
                duplicate_limit_by: duplicateLimitBy,
                field_mappings: processedMappings.map(m => ({
                    meta_field: (m.meta_field || '').trim(),
                    crm_field: m.crm_field,
                    required: m.required ? 1 : 0,
                    default_value: (m.default_value || '').trim() || undefined,
                    transform_function: m.transform_function,
                })),
            });
            sessionStorage.setItem('meta_form_success_message', 'Meta Form created successfully.');
            router.push('/lead-integration/meta-forms');
        } catch (error: any) {
            enqueueSnackbar(error.message || 'Failed to create Meta Form.', { variant: 'error' });
            setIsSaving(false);
        }
    };

    return (
        <DashboardContent maxWidth={false} sx={{ mt: 2 }}>
            {/* Header */}
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={5} mt={3}>
                <Stack spacing={0.5}>
                    <Typography variant="h4" sx={{ fontWeight: 800 }}>
                        Create New Meta Form
                    </Typography>
                </Stack>
                <Stack direction="row" spacing={2}>
                    <Button
                        variant="outlined"
                        color="inherit"
                        onClick={() => router.back()}
                        startIcon={<IoMdArrowBack size={20} />}
                        sx={{ borderRadius: 1.5, fontWeight: 600, textTransform: 'none', px: 2.5 }}
                    >
                        Go Back
                    </Button>
                    <LoadingButton
                        variant="contained"
                        onClick={handleSave}
                        loading={isSaving}
                        sx={{ borderRadius: 1.5, bgcolor: '#059669', color: 'common.white', '&:hover': { bgcolor: '#047857' } }}
                    >
                        Save Meta Form
                    </LoadingButton>
                </Stack>
            </Stack>

            <Stack spacing={3}>
                <Card sx={{ p: 3 }}>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ color: 'text.secondary', mb: 3 }}>
                        <Iconify icon={"logos:meta-icon" as any} width={18} />
                        <Typography variant="subtitle2" sx={{ textTransform: 'uppercase', letterSpacing: 0.2 }}>
                            Meta Form Config
                        </Typography>
                    </Stack>

                    <Stack spacing={3}>
                        <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
                            <FormControlLabel
                                control={
                                    <CustomSwitch
                                        checked={isActive}
                                        onChange={(e) => setIsActive(e.target.checked)}
                                    />
                                }
                                label={
                                    <Stack spacing={0.2}>
                                        <Typography variant="body2" sx={{ fontWeight: 600, pl: 1.5 }}>Is Active</Typography>
                                        <Typography variant="caption" sx={{ color: 'text.secondary', pl: 1.5 }}>Enable processing leads from this form</Typography>
                                    </Stack>
                                }
                                sx={{ ml: 0.5 }}
                            />
                        </Box>

                        <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
                            <TextField
                                fullWidth
                                label="Form Name"
                                required
                                value={formName}
                                onChange={(e) => { setFormName(e.target.value); if (e.target.value) setErrors(p => ({ ...p, formName: false })); }}
                                error={errors.formName}
                                helperText={errors.formName ? 'Form Name is required' : 'Identifiable Facebook form name'}
                            />
                            <TextField
                                fullWidth
                                label="Form ID"
                                required
                                value={formId}
                                onChange={(e) => { setFormId(e.target.value); if (e.target.value) setErrors(p => ({ ...p, formId: false })); }}
                                error={errors.formId}
                                helperText={errors.formId ? 'Form ID is required' : 'Meta Form Unique ID'}
                            />
                        </Box>

                        <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
                            <Autocomplete
                                fullWidth
                                options={metaPages}
                                getOptionLabel={(option) => option.page_name || ''}
                                value={metaPages.find((p) => p.name === metaPage) || null}
                                onChange={(event, newValue) => {
                                    setMetaPage(newValue ? newValue.name : '');
                                    setErrors((p) => ({ ...p, metaPage: false }));
                                }}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        label="Meta Page"
                                        required
                                        error={errors.metaPage}
                                        helperText={errors.metaPage ? 'Meta Page is required' : 'Select page hosting this form'}
                                    />
                                )}
                            />
                            <FormControl fullWidth>
                                <InputLabel id="form-status-label">Form Status</InputLabel>
                                <Select
                                    labelId="form-status-label"
                                    value={formStatus}
                                    label="Form Status"
                                    onChange={(e) => setFormStatus(e.target.value)}
                                >
                                    <MenuItem value="ACTIVE">ACTIVE</MenuItem>
                                    <MenuItem value="ARCHIVED">ARCHIVED</MenuItem>
                                    <MenuItem value="DRAFT">DRAFT</MenuItem>
                                    <MenuItem value="DELETED">DELETED</MenuItem>
                                </Select>
                            </FormControl>
                        </Box>

                        <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
                            <TextField
                                fullWidth
                                label="Locale"
                                value={locale}
                                onChange={(e) => setLocale(e.target.value)}
                                helperText="Form locale (e.g. en_US, es_LA, hi_IN)"
                            />
                        </Box>

                        <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
                            <FormControlLabel
                                control={
                                    <CustomSwitch
                                        checked={allowDuplicates}
                                        onChange={(e) => setAllowDuplicates(e.target.checked)}
                                    />
                                }
                                label={
                                    <Stack spacing={0.2}>
                                        <Typography variant="body2" sx={{ fontWeight: 600, pl: 1.5 }}>Allow Duplicates</Typography>
                                        <Typography variant="caption" sx={{ color: 'text.secondary', pl: 1.5 }}>Process duplicate leads matching limits</Typography>
                                    </Stack>
                                }
                                sx={{ ml: 0.5 }}
                            />
                            {allowDuplicates && (
                                <FormControl fullWidth sx={{ mt: 2 }}>
                                    <InputLabel id="dup-limit-label">Duplicate Limit By</InputLabel>
                                    <Select
                                        labelId="dup-limit-label"
                                        value={duplicateLimitBy}
                                        label="Duplicate Limit By"
                                        onChange={(e) => setDuplicateLimitBy(e.target.value)}
                                    >
                                        <MenuItem value="Email or Phone">Email or Phone</MenuItem>
                                        <MenuItem value="Email Only">Email Only</MenuItem>
                                        <MenuItem value="Phone Only">Phone Only</MenuItem>
                                    </Select>
                                </FormControl>
                            )}
                        </Box>
                    </Stack>
                </Card>

                <Card sx={{ p: 3 }}>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ color: 'text.secondary', mb: 3 }}>
                        <Iconify icon={"solar:settings-bold" as any} width={18} sx={{ color: '#059669' }} />
                        <Typography variant="subtitle2" sx={{ textTransform: 'uppercase', letterSpacing: 0.2 }}>
                            Campaign & Ad Info (Optional tracking parameters)
                        </Typography>
                    </Stack>

                    <Stack spacing={3}>
                        <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
                            <TextField fullWidth label="Campaign ID" value={campaignId} onChange={(e) => setCampaignId(e.target.value)} />
                            <TextField fullWidth label="Campaign Name" value={campaignName} onChange={(e) => setCampaignName(e.target.value)} />
                        </Box>
                        <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
                            <TextField fullWidth label="Ad Set ID" value={adSetId} onChange={(e) => setAdSetId(e.target.value)} />
                            <TextField fullWidth label="Ad Set Name" value={adSetName} onChange={(e) => setAdSetName(e.target.value)} />
                        </Box>
                        <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
                            <TextField fullWidth label="Ad ID" value={adId} onChange={(e) => setAdId(e.target.value)} />
                            <TextField fullWidth label="Ad Name" value={adName} onChange={(e) => setAdName(e.target.value)} />
                        </Box>
                    </Stack>
                </Card>

                <Card sx={{ p: 3 }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ color: 'text.secondary', mb: 3 }}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                            <Iconify icon={"solar:link-bold" as any} width={18} sx={{ color: '#059669' }} />
                            <Typography variant="subtitle2" sx={{ textTransform: 'uppercase', letterSpacing: 0.2 }}>
                                Field Mappings
                            </Typography>
                        </Stack>
                        <Button
                            variant="contained"
                            size="small"
                            onClick={handleAddMappingRow}
                            startIcon={<Iconify icon="mingcute:add-line" />}
                            sx={{ color: '#ffffffff', bgcolor: '#059669', '&:hover': { bgcolor: '#059669', borderColor: '#047857' } }}
                        >
                            Add Field
                        </Button>
                    </Stack>

                    {(() => {
                        const mappedFields = fieldMappings.map((m) => m.crm_field);
                        const missing = mandatoryFields.filter((f) => !mappedFields.includes(f.fieldname));
                        if (missing.length === 0) return null;
                        return (
                            <Alert severity="warning" sx={{ mb: 3, borderRadius: 1 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                    Missing Mandatory CRM Lead Fields:
                                </Typography>
                                <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
                                    Please map Facebook fields or set default values for: {missing.map((f) => f.label).join(', ')}
                                </Typography>
                            </Alert>
                        );
                    })()}

                    <TableContainer sx={{ border: (t) => `1px solid ${t.palette.divider}`, borderRadius: 1.5 }}>
                        <Table>
                            <TableHead sx={{ bgcolor: 'background.neutral' }}>
                                <TableRow>
                                    <TableCell align="center" sx={{ fontWeight: 700, width: 80 }}>Reorder</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Meta Field (Facebook Key)</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>CRM Field (Target Lead column)</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 700 }}>Required</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Default Value</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Transform Function</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 700 }}>Action</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {fieldMappings.map((row, index) => (
                                    <TableRow
                                        key={index}
                                        draggable
                                        onDragStart={(e) => {
                                            e.dataTransfer.setData('text/plain', String(index));
                                        }}
                                        onDragOver={(e) => {
                                            e.preventDefault();
                                        }}
                                        onDrop={(e) => {
                                            e.preventDefault();
                                            const draggedIdx = Number(e.dataTransfer.getData('text/plain'));
                                            if (draggedIdx !== index) {
                                                const updated = [...fieldMappings];
                                                const [draggedItem] = updated.splice(draggedIdx, 1);
                                                updated.splice(index, 0, draggedItem);
                                                setFieldMappings(updated);
                                            }
                                        }}
                                        sx={{
                                            '&:hover': { bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04) },
                                            cursor: 'grab',
                                        }}
                                    >
                                        <TableCell align="center">
                                            <IconButton size="small" disableRipple sx={{ cursor: 'grab', color: 'text.disabled' }}>
                                                <Iconify icon={"solar:menu-dots-bold" as any} width={20} />
                                            </IconButton>
                                        </TableCell>
                                        <TableCell>
                                            <TextField
                                                size="small"
                                                fullWidth
                                                placeholder="e.g. phone_number"
                                                value={row.meta_field}
                                                onChange={(e) => handleMappingChange(index, 'meta_field', e.target.value)}
                                            />
                                        </TableCell>
                                        <TableCell sx={{ minWidth: 180 }}>
                                            <FormControl fullWidth size="small">
                                                <Select
                                                    value={row.crm_field}
                                                    onChange={(e) => handleMappingChange(index, 'crm_field', e.target.value)}
                                                >
                                                    {crmFieldOptions
                                                        .filter((opt) => {
                                                            if (opt.value === row.crm_field) return true;
                                                            if (opt.value === 'notes' || opt.value === 'remarks') return true;
                                                            return !fieldMappings.some((m, idx) => idx !== index && m.crm_field === opt.value);
                                                        })
                                                        .map((opt) => (
                                                            <MenuItem key={opt.value} value={opt.value}>
                                                                {opt.label}
                                                            </MenuItem>
                                                        ))}
                                                </Select>
                                            </FormControl>
                                        </TableCell>
                                        <TableCell align="center">
                                            <CustomSwitch
                                                checked={row.required === 1}
                                                disabled
                                                onChange={(e) => handleMappingChange(index, 'required', e.target.checked ? 1 : 0)}
                                            />
                                        </TableCell>
                                        <TableCell sx={{ minWidth: 200 }}>
                                            {row.crm_field === 'leads_type' ? (
                                                <TextField
                                                    size="small"
                                                    fullWidth
                                                    disabled
                                                    value="Incoming"
                                                />
                                            ) : row.crm_field === 'leads_from' ? (
                                                <Autocomplete
                                                    size="small"
                                                    fullWidth
                                                    options={leadsFromOptions}
                                                    value={row.default_value || ''}
                                                    onChange={async (event, newValue: any) => {
                                                        if (typeof newValue === 'string') {
                                                            handleMappingChange(index, 'default_value', newValue);
                                                        } else if (newValue && newValue.isNew) {
                                                            setNewLeadFromIndex(index);
                                                            setNewLeadFromName(newValue.inputValue);
                                                            setCreateLeadFromOpen(true);
                                                        } else {
                                                            handleMappingChange(index, 'default_value', newValue || '');
                                                        }
                                                    }}
                                                    filterOptions={(options, params) => {
                                                        const filtered = options.filter(option =>
                                                            option.toLowerCase().includes(params.inputValue.toLowerCase())
                                                        );
                                                        const { inputValue } = params;
                                                        const isExisting = options.some((option) => inputValue.toLowerCase() === option.toLowerCase());

                                                        if (inputValue !== '' && !isExisting) {
                                                            filtered.push({
                                                                inputValue,
                                                                label: `+ Create "${inputValue}"`,
                                                                isNew: true,
                                                            } as any);
                                                        } else if (inputValue === '') {
                                                            filtered.push({
                                                                inputValue: '',
                                                                label: '+ Create Lead From',
                                                                isNew: true,
                                                            } as any);
                                                        }
                                                        return filtered;
                                                    }}
                                                    getOptionLabel={(option: any) => {
                                                        if (typeof option === 'string') return option;
                                                        if (option.inputValue) return option.inputValue;
                                                        return option.label || '';
                                                    }}
                                                    renderOption={(props, option: any) => {
                                                        const { key, ...optionProps } = props as any;
                                                        return (
                                                            <Box component="li" key={key || (typeof option === 'string' ? option : option.label)} {...optionProps} sx={{
                                                                typography: 'body2',
                                                                ...(option.isNew && {
                                                                    color: 'primary.main',
                                                                    fontWeight: 600,
                                                                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                                                                    borderTop: (theme) => `1px solid ${theme.palette.divider}`,
                                                                    mt: 0.5,
                                                                    '&:hover': {
                                                                        bgcolor: (theme) => alpha(theme.palette.primary.main, 0.16),
                                                                    }
                                                                })
                                                            }}>
                                                                {option.isNew ? (
                                                                    <Stack direction="row" alignItems="center" spacing={1.5} sx={{ py: 0.5 }}>
                                                                        <Iconify icon="solar:add-circle-bold" width={24} />
                                                                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                                                            {option.inputValue ? `Create "${option.inputValue}"` : 'Create Lead From'}
                                                                        </Typography>
                                                                    </Stack>
                                                                ) : (
                                                                    option.label || option
                                                                )}
                                                            </Box>
                                                        );
                                                    }}
                                                    renderInput={(params) => (
                                                        <TextField {...params} placeholder="Select Lead From" />
                                                    )}
                                                />
                                            ) : (
                                                <TextField
                                                    size="small"
                                                    fullWidth
                                                    placeholder="Fallback value"
                                                    value={row.default_value}
                                                    onChange={(e) => handleMappingChange(index, 'default_value', e.target.value)}
                                                />
                                            )}
                                        </TableCell>
                                        <TableCell sx={{ minWidth: 160 }}>
                                            <FormControl fullWidth size="small">
                                                <Select
                                                    value={row.transform_function}
                                                    onChange={(e) => handleMappingChange(index, 'transform_function', e.target.value)}
                                                >
                                                    {TRANSFORM_OPTIONS.map((opt) => (
                                                        <MenuItem key={opt} value={opt}>
                                                            {opt}
                                                        </MenuItem>
                                                    ))}
                                                </Select>
                                            </FormControl>
                                        </TableCell>
                                        <TableCell align="center">
                                            <IconButton
                                                color="error"
                                                onClick={() => handleRemoveMappingRow(index)}
                                                disabled={fieldMappings.length <= 1}
                                            >
                                                <Iconify icon="solar:trash-bin-trash-bold" />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Card>
            </Stack>

            <Dialog
                open={createLeadFromOpen}
                onClose={() => !creatingLeadFrom && setCreateLeadFromOpen(false)}
                fullWidth
                maxWidth="xs"
                PaperProps={{
                    sx: { borderRadius: 2 }
                }}
            >
                <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, pb: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>Create Lead From</Typography>
                    <IconButton
                        onClick={() => !creatingLeadFrom && setCreateLeadFromOpen(false)}
                        sx={{ color: 'text.secondary' }}
                    >
                        <Iconify icon="mingcute:close-line" />
                    </IconButton>
                </DialogTitle>
                <DialogContent sx={{ px: 3, pb: 2, pt: 1 }}>
                    <TextField
                        fullWidth
                        label="Lead From"
                        value={newLeadFromName}
                        onChange={(e) => setNewLeadFromName(e.target.value)}
                        required
                        autoFocus
                        sx={{ mt: 1 }}
                    />
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button
                        variant="contained"
                        onClick={handleCreateLeadFromSubmit}
                        disabled={creatingLeadFrom || !newLeadFromName.trim()}
                        sx={{ bgcolor: '#059669', color: 'common.white', '&:hover': { bgcolor: '#047857' }, borderRadius: 1 }}
                    >
                        {creatingLeadFrom ? <CircularProgress size={24} color="inherit" /> : 'Create'}
                    </Button>
                </DialogActions>
            </Dialog>
        </DashboardContent>
    );
}
