import dayjs, { type Dayjs } from 'dayjs';
import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

import { uploadFile } from 'src/api/data-import';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = {
    open: boolean;
    onClose: VoidFunction;
    onSubmit: (data: any) => Promise<void>;
    currentData?: any;
};

export function UploadAttendanceFormDialog({ open, onClose, onSubmit, currentData }: Props) {
    const [uploadDate, setUploadDate] = useState<Dayjs | null>(dayjs());
    const [fromDate, setFromDate] = useState<Dayjs | null>(null);
    const [toDate, setToDate] = useState<Dayjs | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (currentData) {
            setUploadDate(currentData.upload_date ? dayjs(currentData.upload_date) : dayjs());
            setFromDate(currentData.att_fr_date ? dayjs(currentData.att_fr_date) : null);
            setToDate(currentData.att_to_date ? dayjs(currentData.att_to_date) : null);
        } else {
            setUploadDate(dayjs());
            setFromDate(null);
            setToDate(null);
        }
    }, [currentData]);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files?.[0]) {
            const selectedFile = event.target.files[0];
            const fileExtension = selectedFile.name.split('.').pop()?.toLowerCase();

            if (fileExtension !== 'csv' && fileExtension !== 'xlsx' && fileExtension !== 'xls') {
                setError('Please upload a CSV, XLSX or XLS file');
                setFile(null);
                return;
            }

            setFile(selectedFile);
            setError('');
        }
    };

    const handleSubmit = async () => {
        if (!uploadDate) {
            setError('Upload date is required');
            return;
        }

        setUploading(true);
        setError('');

        try {
            let fileUrl = currentData?.attendance_file;

            // Upload file if a new one is selected
            if (file) {
                const uploaded = await uploadFile(file);
                fileUrl = uploaded.file_url;
            }

            const formData: any = {
                upload_date: uploadDate?.format('YYYY-MM-DD'),
                att_fr_date: fromDate?.format('YYYY-MM-DD') || null,
                att_to_date: toDate?.format('YYYY-MM-DD') || null,
            };

            if (fileUrl) {
                formData.attendance_file = fileUrl;
            }

            await onSubmit(formData);
            handleClose();
        } catch (err: any) {
            setError(err.message || 'Failed to save');
        } finally {
            setUploading(false);
        }
    };

    const handleClose = () => {
        setUploadDate(dayjs());
        setFromDate(null);
        setToDate(null);
        setFile(null);
        setError('');
        onClose();
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                {currentData ? 'Edit Upload Attendance' : 'Upload Attendance'}
                <IconButton onClick={handleClose} sx={{ color: 'text.secondary' }}>
                    <Iconify icon="mingcute:close-line" />
                </IconButton>
            </DialogTitle>

            <DialogContent>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <Stack spacing={3} sx={{ mt: 2 }}>
                        <DatePicker
                            label="Upload Date *"
                            value={uploadDate}
                            onChange={(newValue) => setUploadDate(newValue)}
                            slotProps={{
                                textField: {
                                    fullWidth: true,
                                    error: !uploadDate && error !== ''
                                }
                            }}
                        />

                        <DatePicker
                            label="Attendance From Date"
                            value={fromDate}
                            onChange={(newValue) => setFromDate(newValue)}
                            slotProps={{
                                textField: {
                                    fullWidth: true
                                }
                            }}
                        />

                        <DatePicker
                            label="Attendance To Date"
                            value={toDate}
                            onChange={(newValue) => setToDate(newValue)}
                            slotProps={{
                                textField: {
                                    fullWidth: true
                                }
                            }}
                        />

                        <Box>
                            <Button
                                component="label"
                                variant="outlined"
                                startIcon={<Iconify icon={"solar:upload-bold" as any} />}
                                fullWidth
                            >
                                {file ? file.name : currentData?.attendance_file ? 'Change File' : 'Upload File (CSV/XLSX/XLS)'}
                                <input
                                    type="file"
                                    hidden
                                    accept=".csv,.xlsx,.xls"
                                    onChange={handleFileChange}
                                />
                            </Button>
                            {file && (
                                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                                    Selected: {file.name}
                                </Typography>
                            )}
                            {currentData?.attendance_file && !file && (
                                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                                    Current: {currentData.attendance_file.split('/').pop()}
                                </Typography>
                            )}
                        </Box>

                        {error && (
                            <Typography variant="body2" color="error">
                                {error}
                            </Typography>
                        )}
                    </Stack>
                </LocalizationProvider>
            </DialogContent>

            <DialogActions>
                <Button
                    variant="contained"
                    onClick={handleSubmit}
                    disabled={uploading || !uploadDate}
                    sx={{ bgcolor: '#059669', '&:hover': { bgcolor: '#047857' } }}
                >
                    {uploading ? 'Saving...' : 'Save'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
