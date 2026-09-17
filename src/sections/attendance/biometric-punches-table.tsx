import dayjs from 'dayjs';
import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import { alpha } from '@mui/material/styles';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';

import { fetchBiometricDevices } from 'src/api/biometric';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export type PunchRecord = {
  name?: string | number;
  punch_time: string;
  punch_type: 'IN' | 'OUT' | string;
  device?: string | null;
  device_name?: string | null;
  serial_number?: string | null;
  source?: string | null;
  doctype?: string;
};

type Props = {
  punches: PunchRecord[];
  title?: string;
  editable?: boolean;
  attendanceDate?: string;
  onPunchesChange?: (punches: PunchRecord[]) => void;
};

export function BiometricPunchesTable({
  punches = [],
  title,
  editable = false,
  attendanceDate,
  onPunchesChange,
}: Props) {
  const [punchPage, setPunchPage] = useState(0);
  const [punchRowsPerPage, setPunchRowsPerPage] = useState(5);
  const [devicesList, setDevicesList] = useState<any[]>([]);
  const [devicesMap, setDevicesMap] = useState<Record<string, any>>({});

  useEffect(() => {
    fetchBiometricDevices({ page: 1, page_size: 100 })
      .then((res: any) => {
        const list = res?.data || [];
        setDevicesList(list);
        const map: Record<string, any> = {};
        list.forEach((d: any) => {
          if (d.name) map[d.name] = d;
          if (d.device_code) map[d.device_code] = d;
          if (d.serial_number) map[d.serial_number] = d;
        });
        setDevicesMap(map);
      })
      .catch(() => {});
  }, []);

  const handleAddPunch = () => {
    const lastPunch = punches[punches.length - 1];
    const nextType = lastPunch?.punch_type === 'IN' ? 'OUT' : 'IN';
    const now = dayjs();
    const baseDate = attendanceDate ? dayjs(attendanceDate) : now;
    const punchTime = baseDate
      .hour(now.hour())
      .minute(now.minute())
      .second(0)
      .format('YYYY-MM-DD HH:mm:ss');

    const newPunch: PunchRecord = {
      doctype: 'Attendance Punch',
      punch_time: punchTime,
      punch_type: nextType,
      source: 'Manual',
      device: '',
      serial_number: '',
    };

    const updated = [...punches, newPunch];
    onPunchesChange?.(updated);

    // Jump to the page showing the new row if needed
    const newTotalPages = Math.ceil(updated.length / punchRowsPerPage);
    if (newTotalPages > 0) {
      setPunchPage(newTotalPages - 1);
    }
  };

  const handleTimeChange = (index: number, newTime: any) => {
    if (!newTime || !newTime.isValid()) return;
    const updated = [...punches];
    const current = dayjs(updated[index].punch_time);
    const base = current.isValid() ? current : (attendanceDate ? dayjs(attendanceDate) : dayjs());
    const updatedDate = base
      .hour(newTime.hour())
      .minute(newTime.minute())
      .second(newTime.second() || 0);

    updated[index] = {
      ...updated[index],
      punch_time: updatedDate.format('YYYY-MM-DD HH:mm:ss'),
    };
    onPunchesChange?.(updated);
  };

  const handleTypeChange = (index: number, newType: string) => {
    const updated = [...punches];
    updated[index] = {
      ...updated[index],
      punch_type: newType,
    };
    onPunchesChange?.(updated);
  };

  const handleDeviceChange = (index: number, deviceVal: string) => {
    const updated = [...punches];
    const matched = devicesMap[deviceVal];
    updated[index] = {
      ...updated[index],
      device: deviceVal || null,
      device_name: matched?.device_name || null,
      serial_number: matched?.serial_number || null,
    };
    onPunchesChange?.(updated);
  };

  const handleDeletePunch = (index: number) => {
    const updated = punches.filter((_, i) => i !== index);
    onPunchesChange?.(updated);
    if (punchPage > 0 && punchPage * punchRowsPerPage >= updated.length) {
      setPunchPage(Math.max(0, punchPage - 1));
    }
  };

  if (!editable && (!punches || punches.length === 0)) {
    return null;
  }

  return (
    <Card
      sx={{
        borderRadius: 2,
        border: (theme: any) => `1px solid ${alpha(theme.palette.grey[500], 0.2)}`,
        boxShadow: (theme: any) => theme.customShadows?.z4 || '0 8px 16px 0 rgba(0, 0, 0, 0.08)',
        overflow: 'hidden',
      }}
    >
      <Box sx={{ px: 2, py: 1.75, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Iconify icon={"solar:fingerprint-bold" as any} sx={{ color: 'primary.main', width: 20, height: 20 }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 700, fontSize: '1.05rem' }}>
            {title || `Biometric Punches (${punches.length})`}
          </Typography>
        </Stack>

        {editable && (
          <Button
            size="small"
            variant="contained"
            startIcon={<Iconify icon={"mingcute:add-line" as any} />}
            onClick={handleAddPunch}
            sx={{
              borderRadius: 1,
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.8rem',
              bgcolor: '#08a3cd',
              color: 'common.white',
              '&:hover': { bgcolor: '#068fb3' },
            }}
          >
            Add Punch
          </Button>
        )}
      </Box>

      {punches.length === 0 ? (
        <Box sx={{ py: 4, px: 2, textAlign: 'center', bgcolor: (theme) => alpha(theme.palette.grey[500], 0.04) }}>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.5 }}>
            No biometric punches recorded for this attendance.
          </Typography>
          {editable && (
            <Button
              size="small"
              variant="outlined"
              startIcon={<Iconify icon={"mingcute:add-line" as any} />}
              onClick={handleAddPunch}
              sx={{ borderRadius: 1, textTransform: 'none' }}
            >
              Add Punch
            </Button>
          )}
        </Box>
      ) : (
        <>
          <TableContainer sx={{ overflow: 'unset' }}>
            <Table size="small">
              <TableHead
                sx={{
                  bgcolor: (theme) => alpha(theme.palette.grey[500], 0.08),
                  '& th': {
                    color: 'text.secondary',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    py: 1.25,
                    borderBottom: (theme) => `1px solid ${alpha(theme.palette.divider, 0.8)}`,
                  },
                }}
              >
                <TableRow>
                  <TableCell sx={{ minWidth: editable ? 220 : 160 }}>Punch Time</TableCell>
                  <TableCell align="center" sx={{ width: editable ? 120 : 100 }}>Direction</TableCell>
                  <TableCell sx={{ minWidth: editable ? 180 : 150 }}>Terminal / Device</TableCell>
                  <TableCell align={editable ? 'center' : 'right'} sx={{ width: 100 }}>Source</TableCell>
                  {editable && <TableCell align="right" sx={{ width: 60, pr: 2 }}>Action</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {punches
                  .slice(punchPage * punchRowsPerPage, punchPage * punchRowsPerPage + punchRowsPerPage)
                  .map((p, pageIdx) => {
                    const actualIdx = punchPage * punchRowsPerPage + pageIdx;
                    const isIn = p.punch_type === 'IN';
                    const deviceObj = (p.device && devicesMap[p.device]) || (p.serial_number && devicesMap[p.serial_number]);
                    const deviceName = p.device_name || deviceObj?.device_name;
                    const deviceId = p.device || deviceObj?.device_code || p.serial_number;

                    return (
                      <TableRow
                        key={actualIdx}
                        hover
                        sx={{
                          '& td': {
                            py: editable ? 1 : 1.25,
                            borderBottom: (theme) => `1px solid ${alpha(theme.palette.divider, 0.5)}`,
                          },
                          '&:last-of-type td': {
                            borderBottom: 'none',
                          },
                        }}
                      >
                        {/* PUNCH TIME */}
                        <TableCell>
                          {editable ? (
                            <Stack direction="row" alignItems="center" spacing={1}>
                              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, minWidth: 70 }}>
                                {dayjs(p.punch_time).isValid() ? dayjs(p.punch_time).format('DD-MM-YYYY') : ''}
                              </Typography>
                              <TimePicker
                                value={dayjs(p.punch_time).isValid() ? dayjs(p.punch_time) : null}
                                onChange={(val) => handleTimeChange(actualIdx, val)}
                                slotProps={{
                                  textField: {
                                    size: 'small',
                                    sx: {
                                      width: 130,
                                      '& .MuiInputBase-input': { py: 0.6, fontSize: '0.8rem', fontWeight: 600 },
                                    },
                                  },
                                }}
                              />
                            </Stack>
                          ) : (
                            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.875rem', color: 'text.primary' }}>
                              {dayjs(p.punch_time).format('DD-MM-YYYY hh:mm:ss A')}
                            </Typography>
                          )}
                        </TableCell>

                        {/* DIRECTION */}
                        <TableCell align="center">
                          {editable ? (
                            <Select
                              size="small"
                              value={p.punch_type || 'IN'}
                              onChange={(e) => handleTypeChange(actualIdx, e.target.value)}
                              sx={{
                                height: 30,
                                minWidth: 72,
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                color: (p.punch_type || 'IN') === 'IN' ? 'success.main' : 'error.main',
                                '& .MuiSelect-select': { py: 0.4, px: 1 },
                              }}
                            >
                              <MenuItem value="IN" sx={{ fontSize: '0.8rem', fontWeight: 700, color: 'success.main' }}>
                                IN
                              </MenuItem>
                              <MenuItem value="OUT" sx={{ fontSize: '0.8rem', fontWeight: 700, color: 'error.main' }}>
                                OUT
                              </MenuItem>
                            </Select>
                          ) : (
                            <Label
                              variant="soft"
                              color={isIn ? 'success' : 'error'}
                              sx={{
                                fontWeight: 700,
                                minWidth: 56,
                                height: 24,
                                fontSize: '0.7125rem',
                              }}
                            >
                              {p.punch_type}
                            </Label>
                          )}
                        </TableCell>

                        {/* TERMINAL / DEVICE */}
                        <TableCell>
                          {editable ? (
                            <Select
                              size="small"
                              value={p.device || ''}
                              onChange={(e) => handleDeviceChange(actualIdx, e.target.value)}
                              displayEmpty
                              sx={{
                                height: 30,
                                minWidth: 140,
                                fontSize: '0.775rem',
                                '& .MuiSelect-select': { py: 0.25, px: 1 },
                              }}
                            >
                              <MenuItem value="">
                                <em>None / Manual</em>
                              </MenuItem>
                              {devicesList.map((dev: any) => (
                                <MenuItem key={dev.name} value={dev.name} sx={{ fontSize: '0.8rem' }}>
                                  {dev.device_name} ({dev.device_code || dev.name})
                                </MenuItem>
                              ))}
                            </Select>
                          ) : (
                            <Stack direction="row" alignItems="center" spacing={1}>
                              <Iconify icon={"solar:devices-bold" as any} sx={{ width: 18, height: 18, color: 'text.disabled', flexShrink: 0 }} />
                              <Box sx={{ minWidth: 0 }}>
                                <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.825rem', color: 'text.primary', lineHeight: 1.25 }}>
                                  {deviceName || deviceId || '—'}
                                </Typography>
                                {deviceId && deviceName && deviceName !== deviceId && (
                                  <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7125rem', fontWeight: 500, display: 'block', lineHeight: 1.2 }}>
                                    {deviceId}
                                  </Typography>
                                )}
                              </Box>
                            </Stack>
                          )}
                        </TableCell>

                        {/* SOURCE */}
                        <TableCell align={editable ? 'center' : 'right'} sx={{ pr: editable ? 1 : 2.5 }}>
                          <Label
                            variant="soft"
                            color={p.source === 'Manual' ? 'warning' : 'info'}
                            sx={{
                              fontWeight: 700,
                              height: 24,
                              fontSize: '0.65rem',
                              letterSpacing: 0.5,
                              textTransform: 'uppercase',
                            }}
                          >
                            {p.source || 'Biometric'}
                          </Label>
                        </TableCell>

                        {/* ACTION (DELETE) */}
                        {editable && (
                          <TableCell align="right" sx={{ pr: 2 }}>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDeletePunch(actualIdx)}
                              sx={{
                                p: 0.5,
                                '&:hover': { bgcolor: (theme) => alpha(theme.palette.error.main, 0.1) },
                              }}
                            >
                              <Iconify icon={"solar:trash-bin-trash-bold" as any} width={18} />
                            </IconButton>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </TableContainer>

          {punches.length > 5 && (
            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={punches.length}
              rowsPerPage={punchRowsPerPage}
              page={punchPage}
              onPageChange={(e, newPage) => setPunchPage(newPage)}
              onRowsPerPageChange={(e) => {
                setPunchRowsPerPage(parseInt(e.target.value, 10));
                setPunchPage(0);
              }}
              sx={{ borderTop: (theme) => `1px solid ${alpha(theme.palette.divider, 0.6)}` }}
            />
          )}
        </>
      )}
    </Card>
  );
}
