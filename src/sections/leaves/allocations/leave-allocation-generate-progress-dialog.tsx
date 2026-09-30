import React, { useRef, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import { alpha } from '@mui/material/styles';
import Collapse from '@mui/material/Collapse';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import LinearProgress from '@mui/material/LinearProgress';

import { autoAllocateMonthlyLeavesNew } from 'src/api/leave-allocations';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = {
    open: boolean;
    onClose: () => void;
    year: number;
    month: number;
    monthName: string;
    employees: string[];
    attendanceMonth?: number;
    attendanceYear?: number;
    onComplete?: (summary: { total: number; created: number; skipped: number; failed: number }) => void;
};

const BATCH_SIZE = 25;

export default function LeaveAllocationGenerateProgressDialog({
    open,
    onClose,
    year,
    month,
    monthName,
    employees,
    attendanceMonth,
    attendanceYear,
    onComplete,
}: Props) {
    const [processedCount, setProcessedCount] = useState(0);
    const [createdCount, setCreatedCount] = useState(0);
    const [skippedCount, setSkippedCount] = useState(0);
    const [failedCount, setFailedCount] = useState(0);
    const [currentBatch, setCurrentBatch] = useState(0);
    const [totalBatches, setTotalBatches] = useState(0);
    const [status, setStatus] = useState<'idle' | 'running' | 'completed' | 'stopped' | 'error'>('idle');
    const [errorLogs, setErrorLogs] = useState<string[]>([]);
    const [showLogs, setShowLogs] = useState(false);

    const isStoppedRef = useRef(false);
    const isRunningRef = useRef(false);
    const onCompleteRef = useRef(onComplete);

    // Refs to preserve progress and allow resume if stopped
    const batchIndexRef = useRef(0);
    const accCreatedRef = useRef(0);
    const accSkippedRef = useRef(0);
    const accFailedRef = useRef(0);
    const accErrorsRef = useRef<string[]>([]);

    useEffect(() => {
        onCompleteRef.current = onComplete;
    }, [onComplete]);

    const totalEmployees = employees.length;

    // Chunk employees into batches
    const batches: string[][] = [];
    for (let i = 0; i < employees.length; i += BATCH_SIZE) {
        batches.push(employees.slice(i, i + BATCH_SIZE));
    }

    const runBatches = async (startFromBatch: number) => {
        if (isRunningRef.current) return;
        isRunningRef.current = true;
        isStoppedRef.current = false;
        setStatus('running');

        for (let i = startFromBatch; i < batches.length; i += 1) {
            if (isStoppedRef.current) {
                setStatus('stopped');
                isRunningRef.current = false;
                return;
            }

            batchIndexRef.current = i;
            setCurrentBatch(i + 1);
            const batch = batches[i];

            try {
                const res = await autoAllocateMonthlyLeavesNew(
                    year,
                    month,
                    false,
                    attendanceMonth,
                    attendanceYear,
                    batch
                );

                const batchCreated = res?.created_count ?? 0;
                const batchSkipped = res?.skipped_count ?? 0;
                const batchErrors = res?.errors ?? [];

                accCreatedRef.current += batchCreated;
                accSkippedRef.current += batchSkipped;

                if (batchErrors && batchErrors.length > 0) {
                    accFailedRef.current += batchErrors.length;
                    accErrorsRef.current.push(...batchErrors);
                }
            } catch (err: any) {
                accFailedRef.current += batch.length;
                accErrorsRef.current.push(`Batch ${i + 1} Error: ${err.message || 'Unknown allocation error'}`);
            }

            const processed = Math.min((i + 1) * BATCH_SIZE, totalEmployees);
            setProcessedCount(processed);
            setCreatedCount(accCreatedRef.current);
            setSkippedCount(accSkippedRef.current);
            setFailedCount(accFailedRef.current);
            setErrorLogs([...accErrorsRef.current]);
        }

        isRunningRef.current = false;

        if (!isStoppedRef.current) {
            setStatus('completed');
            if (onCompleteRef.current) {
                onCompleteRef.current({
                    total: totalEmployees,
                    created: accCreatedRef.current,
                    skipped: accSkippedRef.current,
                    failed: accFailedRef.current,
                });
            }
        }
    };

    useEffect(() => {
        if (!open) {
            isStoppedRef.current = true;
            isRunningRef.current = false;
            setProcessedCount(0);
            setCreatedCount(0);
            setSkippedCount(0);
            setFailedCount(0);
            setCurrentBatch(0);
            setTotalBatches(0);
            setStatus('idle');
            setErrorLogs([]);
            batchIndexRef.current = 0;
            accCreatedRef.current = 0;
            accSkippedRef.current = 0;
            accFailedRef.current = 0;
            accErrorsRef.current = [];
            return;
        }

        if (totalEmployees > 0 && !isRunningRef.current && status === 'idle') {
            setTotalBatches(batches.length);
            runBatches(0);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, totalEmployees]);

    const progress = totalEmployees > 0 ? Math.min(100, Math.round((processedCount / totalEmployees) * 100)) : 0;

    const handleStop = () => {
        isStoppedRef.current = true;
        setStatus('stopped');
    };

    const handleResume = () => {
        if (status === 'stopped') {
            const nextBatch = batchIndexRef.current + 1;
            if (nextBatch < batches.length) {
                runBatches(nextBatch);
            } else {
                setStatus('completed');
            }
        }
    };

    const handleDone = () => {
        onClose();
    };

    return (
        <Dialog
            open={open}
            onClose={status === 'running' ? undefined : onClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: 2,
                    p: 1,
                    overflow: 'hidden',
                },
            }}
        >
            <DialogTitle sx={{ pb: 1, pt: 2, px: 3 }}>
                <Stack direction="row" alignItems="center" spacing={1.5}>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography variant="h6" sx={{ fontWeight: 700 }}>
                            {status === 'completed'
                                ? 'Allocation Complete'
                                : status === 'stopped'
                                ? 'Allocation Paused'
                                : 'Allocating Leaves'}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.25 }}>
                            {monthName} {year} &bull; {totalEmployees} employee{totalEmployees === 1 ? '' : 's'}
                        </Typography>
                    </Box>
                </Stack>
            </DialogTitle>

            <DialogContent sx={{ px: 3, py: 2 }}>
                <Stack spacing={2.5}>
                    {/* Progress Bar Header & Percentage */}
                    <Box>
                        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                {status === 'completed'
                                    ? 'All batches processed successfully'
                                    : status === 'stopped'
                                    ? `Stopped at batch ${currentBatch} of ${totalBatches}`
                                    : `Batch ${currentBatch} of ${totalBatches} (${processedCount} / ${totalEmployees})`}
                            </Typography>
                            <Typography
                                variant="h6"
                                sx={{
                                    fontWeight: 700,
                                    color: status === 'completed' ? 'success.main' : 'primary.main',
                                }}
                            >
                                {progress}%
                            </Typography>
                        </Stack>

                        {/* Animated Progressive Loader */}
                        <LinearProgress
                            variant="determinate"
                            value={progress}
                            sx={{
                                height: 12,
                                borderRadius: 6,
                                bgcolor: (t) => alpha(t.palette.primary.main, 0.12),
                                '& .MuiLinearProgress-bar': {
                                    borderRadius: 6,
                                    bgcolor: status === 'completed' ? 'success.main' : 'primary.main',
                                    transition: 'transform 0.4s ease-in-out',
                                },
                            }}
                        />
                    </Box>

                    {/* Live Stats Summary Cards / Badges */}
                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, 1fr)',
                            gap: 1.5,
                        }}
                    >
                        <Card
                            variant="outlined"
                            sx={{
                                p: 1.5,
                                textAlign: 'center',
                                bgcolor: (t) => alpha(t.palette.success.main, 0.05),
                                borderColor: (t) => alpha(t.palette.success.main, 0.2),
                            }}
                        >
                            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                                Created
                            </Typography>
                            <Typography variant="h5" sx={{ color: 'success.main', fontWeight: 700, mt: 0.25 }}>
                                {createdCount}
                            </Typography>
                        </Card>

                        <Card
                            variant="outlined"
                            sx={{
                                p: 1.5,
                                textAlign: 'center',
                                bgcolor: (t) => alpha(t.palette.warning.main, 0.05),
                                borderColor: (t) => alpha(t.palette.warning.main, 0.2),
                            }}
                        >
                            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                                Skipped (Existing)
                            </Typography>
                            <Typography variant="h5" sx={{ color: 'warning.main', fontWeight: 700, mt: 0.25 }}>
                                {skippedCount}
                            </Typography>
                        </Card>

                        <Card
                            variant="outlined"
                            sx={{
                                p: 1.5,
                                textAlign: 'center',
                                bgcolor: (t) => alpha(t.palette.error.main, 0.05),
                                borderColor: (t) => alpha(t.palette.error.main, 0.2),
                            }}
                        >
                            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                                Errors
                            </Typography>
                            <Typography variant="h5" sx={{ color: 'error.main', fontWeight: 700, mt: 0.25 }}>
                                {failedCount}
                            </Typography>
                        </Card>
                    </Box>

                    {/* Status hint while running */}
                    {status === 'running' && (
                        <Alert severity="info" sx={{ py: 0.5, fontSize: '0.85rem' }}>
                            Allocating leaves in background batches. Please keep this browser window open.
                        </Alert>
                    )}

                    {/* Success message when done */}
                    {status === 'completed' && (
                        <Alert severity="success" sx={{ py: 0.5, fontSize: '0.85rem' }}>
                            Leave allocation finished! <strong>{createdCount}</strong> records created
                            {skippedCount > 0 ? `, ${skippedCount} skipped because they already existed.` : '.'}
                        </Alert>
                    )}

                    {/* Error logs collapse if any */}
                    {errorLogs.length > 0 && (
                        <Box>
                            <Button
                                size="small"
                                color="error"
                                onClick={() => setShowLogs((prev) => !prev)}
                                startIcon={
                                    <Iconify
                                        icon={showLogs ? 'eva:arrow-ios-upward-fill' : 'eva:arrow-ios-downward-fill'}
                                    />
                                }
                                sx={{ textTransform: 'none', px: 0 }}
                            >
                                {showLogs ? 'Hide Error Details' : `Show ${errorLogs.length} Error Details`}
                            </Button>
                            <Collapse in={showLogs}>
                                <Box
                                    sx={{
                                        mt: 1,
                                        p: 1.5,
                                        borderRadius: 1,
                                        bgcolor: 'background.neutral',
                                        maxHeight: 140,
                                        overflowY: 'auto',
                                        fontFamily: 'monospace',
                                        fontSize: '0.75rem',
                                        color: 'error.main',
                                    }}
                                >
                                    {errorLogs.map((log, idx) => (
                                        <Typography key={idx} variant="caption" component="div">
                                            &bull; {log}
                                        </Typography>
                                    ))}
                                </Box>
                            </Collapse>
                        </Box>
                    )}
                </Stack>
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 2, pt: 1 }}>
                {status === 'running' && (
                    <Button
                        variant="outlined"
                        color="inherit"
                        size="medium"
                        onClick={handleStop}
                        sx={{ textTransform: 'none' }}
                    >
                        Stop Processing
                    </Button>
                )}

                {status === 'stopped' && (
                    <>
                        <Button
                            variant="outlined"
                            color="inherit"
                            size="medium"
                            onClick={handleDone}
                            sx={{ textTransform: 'none' }}
                        >
                            Close
                        </Button>
                        <Button
                            variant="contained"
                            color="primary"
                            size="medium"
                            onClick={handleResume}
                            startIcon={<Iconify icon={"solar:play-circle-bold" as any} />}
                            sx={{ textTransform: 'none' }}
                        >
                            Resume Allocation
                        </Button>
                    </>
                )}

                {status === 'completed' && (
                    <Button
                        variant="contained"
                        color="primary"
                        size="medium"
                        onClick={handleDone}
                        sx={{ textTransform: 'none', minWidth: 120 }}
                    >
                        View Leave Allocations
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
}
