import { useState, useEffect } from 'react';
import { MuiTelInput } from 'mui-tel-input';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import { alpha } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import DialogTitle from '@mui/material/DialogTitle';
import Autocomplete from '@mui/material/Autocomplete';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import CircularProgress from '@mui/material/CircularProgress';

import { frappeRequest } from 'src/utils/csrf';
import { validatePhoneNumber } from 'src/utils/employee-validation';

import { COMMON_COLORS } from 'src/theme';
import { getDoctypeList } from 'src/api/leads';
import { submitReferral } from 'src/api/referrals';

import { Iconify } from 'src/components/iconify';

import { useAuth } from 'src/auth/auth-context';

// ----------------------------------------------------------------------

type Props = {
  open: boolean;
  onClose: VoidFunction;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
  selectedJob?: string;
  jobOptions: { name: string; job_title: string }[];
  isHR?: boolean;
};

export function ReferralModal({ open, onClose, onSuccess, onError, selectedJob, jobOptions, isHR }: Props) {
  const { user } = useAuth();
  const isHRUser = isHR !== undefined ? isHR : Boolean(
    user?.roles?.some((role: string) => ['HR Manager', 'HR', 'HR User', 'System Manager', 'Administrator'].includes(role))
  );

  const [formData, setFormData] = useState({
    referrer: '',
    candidate_name: '',
    candidate_email: '',
    candidate_phone: '',
    job_opening: '',
    resume: null as string | null,
    relationship: '',
    notes: '',
  });

  const [employeeOptions, setEmployeeOptions] = useState<any[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open && isHRUser) {
      setLoadingEmployees(true);
      getDoctypeList('Employee', ['name', 'employee_name', 'department', 'designation'], undefined, 1000)
        .then((res: any) => {
          if (Array.isArray(res)) {
            setEmployeeOptions(res);
          }
        })
        .catch((err) => console.error('Failed to fetch employees', err))
        .finally(() => setLoadingEmployees(false));
    }
  }, [open, isHRUser]);

  useEffect(() => {
    if (open) {
      setFormData({
        referrer: user?.employee || '',
        candidate_name: '',
        candidate_email: '',
        candidate_phone: '',
        job_opening: selectedJob || '',
        resume: null,
        relationship: '',
        notes: '',
      });
      setFileName(null);
      setErrors({});
    }
  }, [open, selectedJob, user?.employee]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handlePhoneChange = (value: string) => {
    setFormData((prev) => ({ ...prev, candidate_phone: value }));
    if (errors.candidate_phone) {
      const err = validatePhoneNumber(value, 'Candidate Phone', { required: true });
      setErrors((prev) => {
        const newErrors = { ...prev };
        if (err) {
          newErrors.candidate_phone = err;
        } else {
          delete newErrors.candidate_phone;
        }
        return newErrors;
      });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const fileNameLower = (file.name || '').toLowerCase();
      const isVideo = file.type?.toLowerCase().startsWith('video/') || [
        '.mp4', '.webm', '.mkv', '.mov', '.avi', '.flv', '.wmv', '.m4v', '.3gp', '.ogg', '.ogv', '.ts'
      ].some((ext) => fileNameLower.endsWith(ext));

      if (isVideo) {
        setErrors((prev) => ({ ...prev, resume: 'Video files are not allowed. Please upload a PDF or DOCX file.' }));
        return;
      }

      setUploading(true);
      setFileName(file.name);
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.resume;
        return newErrors;
      });

      const formDataUpload = new FormData();
      formDataUpload.append('file', file, file.name);
      formDataUpload.append('is_private', '0');

      try {
        const res = await frappeRequest('/api/method/upload_file', {
          method: 'POST',
          body: formDataUpload,
        });
        const result = await res.json();
        const fileUrl = result.message?.file_url || result.file_url;

        if (fileUrl) {
          setFormData((prev) => ({ ...prev, resume: fileUrl }));
        } else {
          throw new Error('Upload failed - No URL returned');
        }
      } catch (error) {
        console.error('Upload failed:', error);
        setErrors((prev) => ({ ...prev, resume: 'Upload failed. Please try again.' }));
        setFileName(null);
      } finally {
        setUploading(false);
      }
    }
  };


  const handleClearFile = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setFileName(null);
    setFormData((prev) => ({ ...prev, resume: null }));
    setErrors((prev) => ({ ...prev, resume: 'Resume is required' }));
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (isHRUser && !formData.referrer) newErrors.referrer = 'Referrer is required';
    if (!formData.candidate_name) newErrors.candidate_name = 'Candidate Name is required';
    if (!formData.candidate_email) {
      newErrors.candidate_email = 'Candidate Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.candidate_email)) {
      newErrors.candidate_email = 'Invalid email format';
    }
    const phoneError = validatePhoneNumber(formData.candidate_phone, 'Candidate Phone', { required: true });
    if (phoneError) {
      newErrors.candidate_phone = phoneError;
    }
    if (!formData.job_opening) newErrors.job_opening = 'Job Opening is required';
    if (!formData.resume) newErrors.resume = 'Resume is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const formatPhoneNumber = (phone: string) => {
    if (!phone) return '';
    // Format: remove spaces and add hyphen after dial code (e.g., +91-9876543210)
    let formatted = phone.replace(/\s/g, '');
    const parts = phone.trim().split(/\s+/);
    if (parts.length > 1 && parts[0].startsWith('+')) {
      formatted = `${parts[0]}-${parts.slice(1).join('')}`;
    }
    return formatted;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const submissionData: any = {
        candidate_name: formData.candidate_name,
        candidate_email: formData.candidate_email,
        candidate_phone: formatPhoneNumber(formData.candidate_phone),
        job_opening: formData.job_opening,
        resume: formData.resume,
        relationship: formData.relationship,
        notes: formData.notes,
      };

      if (isHRUser && formData.referrer) {
        submissionData.referrer = formData.referrer;
      } else if (user?.employee) {
        submissionData.referrer = user.employee;
      }

      await submitReferral(submissionData);

      onSuccess('Referral submitted successfully!');
      onClose();
      // Reset form
      setFormData({
        referrer: user?.employee || '',
        candidate_name: '',
        candidate_email: '',
        candidate_phone: '',
        job_opening: '',
        resume: null,
        relationship: '',
        notes: '',
      });
      setFileName(null);

    } catch (error: any) {
      console.error(error);
      onError(error.message || 'Failed to submit referral');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      PaperProps={{
        sx: {
          borderRadius: 2,
          boxShadow: (themeVar) => themeVar.customShadows.z24,
          m: { xs: 1.5, sm: 2 },
          maxHeight: { xs: 'calc(100% - 32px)', sm: '90vh' },
          display: 'flex',
          flexDirection: 'column',
        }
      }}
    >
      <DialogTitle
        sx={{
          m: 0,
          p: { xs: 2, sm: 2.5 },
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Refer a Candidate
        </Typography>

        <IconButton
          onClick={onClose}
          sx={{ color: (theme) => theme.palette.grey[500] }}
        >
          <Iconify icon="mingcute:close-line" width={20} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: { xs: 2, sm: 3 }, flexGrow: 1, overflowY: 'auto' }}>
        <Stack spacing={3} sx={{ pt: { xs: 1, sm: 2 } }}>
          <Box display="grid" gridTemplateColumns={{ xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)' }} gap={2}>
            {isHRUser ? (
              <Autocomplete
                fullWidth
                options={employeeOptions}
                loading={loadingEmployees}
                openOnFocus
                getOptionLabel={(option: any) => {
                  if (typeof option === 'string') return option;
                  return option.employee_name ? `${option.employee_name} (${option.name})` : option.name || '';
                }}
                value={
                  employeeOptions.find(
                    (emp: any) => emp.name === formData.referrer || emp.employee_name === formData.referrer
                  ) || (formData.referrer ? { name: formData.referrer, employee_name: formData.referrer } : null)
                }
                onChange={(_event, newValue: any) => {
                  setFormData((prev) => ({
                    ...prev,
                    referrer: newValue ? newValue.name : '',
                  }));
                  if (errors.referrer) {
                    setErrors((prev) => {
                      const newErrors = { ...prev };
                      delete newErrors.referrer;
                      return newErrors;
                    });
                  }
                }}
                isOptionEqualToValue={(option: any, value: any) =>
                  option?.name === value?.name || option?.name === value
                }
                noOptionsText="No Employees Found"
                renderOption={(props, option) => {
                  const { key, ...optionProps } = props as any;
                  return (
                    <li key={key} {...optionProps}>
                      <Stack spacing={0.25}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          {option.employee_name || option.name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          ID: {option.name} {option.department ? `• ${option.department}` : ''} {option.designation ? `• ${option.designation}` : ''}
                        </Typography>
                      </Stack>
                    </li>
                  );
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    name="referrer"
                    label="Referrer *"
                    placeholder="Select Referrer Employee"
                    error={!!errors.referrer}
                    helperText={errors.referrer}
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {loadingEmployees ? <CircularProgress color="inherit" size={20} /> : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
                sx={{ gridColumn: { xs: 'span 1', sm: 'span 2' } }}
              />
            ) : (
              <TextField
                fullWidth
                name="referrer"
                label="Referrer"
                value={user?.employee_name || user?.full_name || user?.name || ''}
                disabled
                InputProps={{
                  readOnly: true,
                }}
                sx={{
                  gridColumn: { xs: 'span 1', sm: 'span 2' },
                  '& .MuiInputBase-input.Mui-disabled': {
                    WebkitTextFillColor: (theme) => theme.palette.text.primary,
                    fontWeight: 500,
                  },
                }}
              />
            )}
            <TextField
              name="candidate_name"
              label="Candidate Name *"
              value={formData.candidate_name}
              onChange={handleChange}
              fullWidth
              error={!!errors.candidate_name}
              helperText={errors.candidate_name}
            />
            <TextField
              name="candidate_email"
              label="Candidate Email *"
              value={formData.candidate_email}
              onChange={handleChange}
              fullWidth
              error={!!errors.candidate_email}
              helperText={errors.candidate_email}
            />
            <MuiTelInput
              name="candidate_phone"
              label="Candidate Phone *"
              defaultCountry="IN"
              value={formData.candidate_phone}
              onChange={handlePhoneChange}
              fullWidth
              error={!!errors.candidate_phone}
              helperText={errors.candidate_phone}
            />
            <Autocomplete
              fullWidth
              disabled={!!selectedJob}
              options={jobOptions}
              openOnFocus
              getOptionLabel={(option: any) => {
                if (typeof option === 'string') return option;
                return option?.job_title || option?.name || '';
              }}
              value={
                jobOptions.find(
                  (job: any) => job.name === formData.job_opening || job.job_title === formData.job_opening
                ) || (formData.job_opening ? { name: formData.job_opening, job_title: formData.job_opening } : null)
              }
              onChange={(_event, newValue: any) => {
                setFormData((prev) => ({
                  ...prev,
                  job_opening: newValue ? newValue.name : '',
                }));
                if (errors.job_opening) {
                  setErrors((prev) => {
                    const newErrors = { ...prev };
                    delete newErrors.job_opening;
                    return newErrors;
                  });
                }
              }}
              isOptionEqualToValue={(option: any, value: any) =>
                option?.name === value?.name || option?.name === value
              }
              noOptionsText="No Openings"
              renderInput={(params) => (
                <TextField
                  {...params}
                  name="job_opening"
                  label="Job Opening *"
                  placeholder={jobOptions.length === 0 ? 'No Openings' : 'Select Job Opening'}
                  error={!!errors.job_opening}
                  helperText={errors.job_opening}
                />
              )}
            />

            <Box sx={{ gridColumn: { xs: 'span 1', sm: 'span 2' } }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Resume (Attachment) <Box component="span" sx={{ color: 'error.main' }}>*</Box>
              </Typography>
              <Button
                component="label"
                fullWidth
                variant="outlined"
                sx={{
                  p: 3,
                  borderStyle: 'dashed',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1,
                  alignItems: 'center',
                  color: (errors.resume ? 'error.main' : (fileName ? 'primary.main' : 'text.secondary')),
                  borderColor: errors.resume ? 'error.main' : 'divider',
                  bgcolor: (theme) => fileName ? alpha(theme.palette.primary.main, 0.04) : 'background.neutral',
                  '&:hover': {
                    bgcolor: (theme) => alpha(fileName ? theme.palette.primary.main : theme.palette.text.primary, 0.08),
                    borderColor: errors.resume ? 'error.main' : 'primary.main',
                  },
                }}
              >
                {uploading ? (
                  <Stack alignItems="center" spacing={1}>
                    <CircularProgress size={24} color="inherit" />
                    <Typography variant="caption">Uploading...</Typography>
                  </Stack>
                ) : (
                  <>
                    <Iconify icon={fileName ? "solar:document-bold-duotone" : "solar:upload-minimalistic-bold"} width={32} />
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {fileName || "Click to upload Resume (PDF, DOCX)"}
                    </Typography>
                  </>
                )}
                {fileName && !uploading && (
                  <IconButton
                    size="small"
                    onClick={handleClearFile}
                    sx={{ position: 'absolute', top: 8, right: 8 }}
                  >
                    <Iconify icon="mingcute:close-line" width={16} />
                  </IconButton>
                )}
                <input type="file" hidden accept=".pdf,.doc,.docx" onChange={handleFileUpload} disabled={uploading} />
              </Button>
              {errors.resume && (
                <Typography variant="caption" sx={{ color: 'error.main', mt: 0.5, display: 'block' }}>
                  {errors.resume}
                </Typography>
              )}
            </Box>


            <TextField
              name="relationship"
              label="Relationship with Candidate"
              value={formData.relationship}
              onChange={handleChange}
              fullWidth
              sx={{ gridColumn: { xs: 'span 1', sm: 'span 2' } }}
            />
            <TextField
              name="notes"
              label="Notes"
              value={formData.notes}
              onChange={handleChange}
              fullWidth
              multiline
              rows={3}
              sx={{ gridColumn: { xs: 'span 1', sm: 'span 2' } }}
            />
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 1.5 }}>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={uploading}
          loading={isSubmitting}
          sx={{
            bgcolor: COMMON_COLORS.primaryButton.bg,
            color: COMMON_COLORS.primaryButton.color,
            '&:hover': {
              bgcolor: COMMON_COLORS.primaryButton.hoverBg,
            },
          }}
        >
          Submit Referral
        </Button>
      </DialogActions>
    </Dialog>
  );
}
