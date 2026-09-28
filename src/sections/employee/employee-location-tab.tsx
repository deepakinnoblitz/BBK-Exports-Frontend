import type { Dayjs } from 'dayjs';

import dayjs from 'dayjs';
import { useSnackbar } from 'notistack';
import { useRef, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Timeline from '@mui/lab/Timeline';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import { alpha } from '@mui/material/styles';
import MenuItem from '@mui/material/MenuItem';
import TimelineDot from '@mui/lab/TimelineDot';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import Typography from '@mui/material/Typography';
import FormControl from '@mui/material/FormControl';
import CardContent from '@mui/material/CardContent';
import TimelineContent from '@mui/lab/TimelineContent';
import TimelineSeparator from '@mui/lab/TimelineSeparator';
import TimelineConnector from '@mui/lab/TimelineConnector';
import { MobileTimePicker } from '@mui/x-date-pickers/MobileTimePicker';
import TimelineItem, { timelineItemClasses } from '@mui/lab/TimelineItem';

import { fDateTime } from 'src/utils/format-time';

import { getLocationLogs } from 'src/api/presence';

import { Iconify } from 'src/components/iconify';

const STATUS_DISPLAY_MAP: Record<string, string> = {
  'Available': 'Available - Logged In',
  'Busy': 'In Client Meeting',
  'Do Not Disturb': 'Team Discussion',
  'Break': 'Lunch Break',
  'Away': 'Break',
  'Offline': 'Offline - Logout',
};

interface LocationLog {
  name: string;
  employee: string;
  session?: string;
  status?: string;
  source?: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  logged_at: string;
  device_type?: string;
  ip_address?: string;
}

const parseUserAgent = (userAgent?: string) => {
  if (!userAgent) return { os: 'Unknown OS', browser: '', icon: 'solar:laptop-bold' };

  const ua = userAgent.toLowerCase();
  let os = 'Unknown OS';
  let icon = 'solar:laptop-bold';

  if (ua.includes('windows')) {
    os = 'Windows';
    icon = 'mdi:microsoft-windows';
  } else if (ua.includes('macintosh') || ua.includes('mac os x')) {
    os = 'macOS';
    icon = 'mdi:apple';
  } else if (ua.includes('android')) {
    os = 'Android';
    icon = 'mdi:android';
  } else if (ua.includes('iphone') || ua.includes('ipad')) {
    os = 'iOS';
    icon = 'mdi:apple';
  } else if (ua.includes('linux')) {
    os = 'Linux';
    icon = 'mdi:linux';
  }

  let browser = '';
  if (ua.includes('edg')) {
    browser = 'Edge';
  } else if (ua.includes('chrome') || ua.includes('crios')) {
    browser = 'Chrome';
  } else if (ua.includes('firefox')) {
    browser = 'Firefox';
  } else if (ua.includes('safari') && !ua.includes('chrome')) {
    browser = 'Safari';
  } else if (ua.includes('opera') || ua.includes('opr')) {
    browser = 'Opera';
  }

  return { os, browser, icon };
};

function TimelineItemAddress({ log }: { log: LocationLog }) {
  const [address, setAddress] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const fetchAddress = async () => {
      // 1. Primary: ArcGIS World Geocoder (High-Precision Street Level Address)
      try {
        const res = await fetch(
          `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/reverseGeocode?location=${log.longitude},${log.latitude}&f=json`
        );
        if (res.ok) {
          const data = await res.json();
          if (active && data && data.address) {
            const a = data.address;
            const streetOrPlace = a.Address || a.PlaceName || a.ShortLabel || '';
            const area = a.District || a.Neighborhood || a.Sector || '';
            const city = a.MetroArea || a.City || a.Subregion || '';

            let formatted = '';
            if (streetOrPlace && area && streetOrPlace !== area) {
              formatted = `${streetOrPlace}, ${area}`;
            } else if (streetOrPlace && city && streetOrPlace !== city) {
              formatted = `${streetOrPlace}, ${city}`;
            } else if (streetOrPlace) {
              formatted = streetOrPlace;
            } else if (a.Match_addr) {
              formatted = a.Match_addr.split(',').slice(0, 2).join(', ');
            }

            if (formatted) {
              setAddress(formatted);
              setLoading(false);
              return;
            }
          }
        }
      } catch (e) {
        // Fallback to secondary APIs
      }

      // 2. Secondary: Nominatim (OpenStreetMap)
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${log.latitude}&lon=${log.longitude}&format=jsonv2&zoom=18&addressdetails=1`,
          {
            headers: {
              'Accept-Language': 'en',
            },
          }
        );
        if (res.ok) {
          const data = await res.json();
          if (active && data && (data.address || data.display_name)) {
            const addr = data.address || {};
            const street = addr.road || addr.street || addr.pedestrian || addr.footway || addr.path || addr.amenity || addr.building || '';
            const area = addr.suburb || addr.neighbourhood || addr.city_district || addr.quarter || addr.residential || '';
            const city = addr.city || addr.town || addr.village || addr.county || '';

            let formatted = '';
            if (street && area && street !== area) {
              formatted = `${street}, ${area}`;
            } else if (street && city && street !== city) {
              formatted = `${street}, ${city}`;
            } else if (street) {
              formatted = street;
            } else if (data.display_name) {
              const parts = data.display_name.split(',').map((s: string) => s.trim());
              formatted = parts.slice(0, 2).join(', ');
            }

            if (formatted) {
              setAddress(formatted);
              setLoading(false);
              return;
            }
          }
        }
      } catch (e) {
        // Fallback to tertiary API
      }

      // 3. Tertiary: BigDataCloud Free Reverse Geocoding Client API
      try {
        const res = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${log.latitude}&longitude=${log.longitude}&localityLanguage=en`
        );
        if (res.ok) {
          const data = await res.json();
          if (active && data) {
            const informatives = data.localityInfo?.informative || [];
            const roadObj = informatives.find((i: any) => i.description === 'road' || i.order >= 8);
            const roadName = roadObj?.name || '';
            const locality = data.locality || '';
            const city = data.city || data.principalSubdivision || '';

            const parts = Array.from(new Set([roadName, locality, city])).filter(Boolean);
            if (parts.length > 0) {
              setAddress(parts.slice(0, 2).join(', '));
              setLoading(false);
              return;
            }
          }
        }
      } catch (e) {
        // Ignore
      }

      // 3. Fallback to clean coordinates display if providers unavailable
      if (active) {
        setAddress(`${log.latitude.toFixed(4)}°, ${log.longitude.toFixed(4)}°`);
        setLoading(false);
      }
    };

    fetchAddress();

    return () => {
      active = false;
    };
  }, [log.latitude, log.longitude]);

  if (loading) {
    return (
      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
        <Iconify icon={"svg-spinners:180-ring" as any} width={12} /> Loading address...
      </Typography>
    );
  }

  return (
    <Typography variant="caption" sx={{ display: 'block', mt: 0.5, fontWeight: 500, color: 'text.secondary' }}>
      📍 {address}
    </Typography>
  );
}

export default function EmployeeLocationTab({ employeeId, sessionId }: { employeeId: string; sessionId?: string }) {
  const [logs, setLogs] = useState<LocationLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<LocationLog[]>([]);
  const [selectedLog, setSelectedLog] = useState<LocationLog | null>(null);
  const { enqueueSnackbar } = useSnackbar();

  const renderDetailItem = (label: string, value: string | React.ReactNode, icon: string, color: string = 'primary.main') => (
    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ p: 2, borderRadius: 1.5, border: (theme) => `1px solid ${alpha(theme.palette.divider, 0.5)}` }}>
      <Box
        sx={{
          width: 36,
          height: 36,
          borderRadius: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
          color,
        }}
      >
        <Iconify icon={icon as any} width={20} />
      </Box>
      <Box sx={{ minWidth: 0, flexGrow: 1 }}>
        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', mb: 0.25 }}>
          {label}
        </Typography>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          {value}
        </Typography>
      </Box>
    </Stack>
  );

  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [startTimeFilter, setStartTimeFilter] = useState<Dayjs | null>(null);
  const [endTimeFilter, setEndTimeFilter] = useState<Dayjs | null>(null);

  const handleClearAllFilters = () => {
    setStatusFilter('all');
    setSourceFilter('all');
    setStartTimeFilter(null);
    setEndTimeFilter(null);
  };

  const handleStartTimeChange = (newValue: Dayjs | null) => {
    setStartTimeFilter(newValue);
    if (newValue && endTimeFilter && newValue.isAfter(endTimeFilter)) {
      setEndTimeFilter(null);
      enqueueSnackbar('Start time cannot be after end time. End time has been cleared.', { variant: 'warning' });
    }
  };

  const handleEndTimeChange = (newValue: Dayjs | null) => {
    setEndTimeFilter(newValue);
    if (newValue && startTimeFilter && newValue.isBefore(startTimeFilter)) {
      enqueueSnackbar('End time must be after start time. Start time has been cleared.', { variant: 'warning' });
    }
  };

  const hasAnyFilter = statusFilter !== 'all' || sourceFilter !== 'all' || startTimeFilter !== null || endTimeFilter !== null;

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersGroupRef = useRef<any>(null);
  const polylineRef = useRef<any>(null);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [mapMode, setMapMode] = useState<'streets' | 'satellite'>('streets');
  const tileLayerRef = useRef<any>(null);
  const labelsLayerRef = useRef<any>(null);



  // Dynamic Leaflet Loader
  useEffect(() => {
    if ((window as any).L) {
      setLeafletLoaded(true);
      return;
    }

    const cssLink = document.createElement('link');
    cssLink.rel = 'stylesheet';
    cssLink.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    cssLink.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
    cssLink.crossOrigin = '';
    document.head.appendChild(cssLink);

    const jsScript = document.createElement('script');
    jsScript.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    jsScript.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
    jsScript.crossOrigin = '';
    jsScript.onload = () => setLeafletLoaded(true);
    document.head.appendChild(jsScript);
  }, []);

  // Fetch Location Logs
  const fetchLogs = useCallback(async () => {
    try {
      const data = await getLocationLogs(employeeId, sessionId);
      setLogs(data);
      if (data.length > 0) {
        setSelectedLog(data[data.length - 1]); // Set latest location as default
      }
    } catch (err) {
      console.error('Failed to load location logs:', err);
    }
  }, [employeeId, sessionId]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Apply filters
  useEffect(() => {
    let filtered = [...logs];
    if (statusFilter !== 'all') {
      filtered = filtered.filter((log) => log.status === statusFilter);
    }
    if (sourceFilter !== 'all') {
      filtered = filtered.filter((log) => log.source === sourceFilter);
    }
    if (startTimeFilter) {
      const startStr = startTimeFilter.format('HH:mm');
      filtered = filtered.filter((log) => {
        const logDate = dayjs(log.logged_at);
        const logTimeStr = logDate.format('HH:mm');
        return logTimeStr >= startStr;
      });
    }
    if (endTimeFilter) {
      const endStr = endTimeFilter.format('HH:mm');
      filtered = filtered.filter((log) => {
        const logDate = dayjs(log.logged_at);
        const logTimeStr = logDate.format('HH:mm');
        return logTimeStr <= endStr;
      });
    }
    setFilteredLogs(filtered);
  }, [logs, statusFilter, sourceFilter, startTimeFilter, endTimeFilter]);

  // Initialize Map
  useEffect(() => {
    if (!leafletLoaded || !mapContainerRef.current) return () => { };

    const L = (window as any).L;
    if (!L) return () => { };

    // Create map if it doesn't exist
    if (!mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current, { 
        zoomControl: false,
        attributionControl: false
      }).setView([0, 0], 2);
      markersGroupRef.current = L.featureGroup().addTo(mapRef.current);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        tileLayerRef.current = null;
      }
    };
  }, [leafletLoaded]);

  // Manage Map Layers (Street vs Satellite)
  useEffect(() => {
    if (!leafletLoaded || !mapRef.current) return () => { };

    const L = (window as any).L;
    if (!L) return () => { };

    if (tileLayerRef.current) {
      mapRef.current.removeLayer(tileLayerRef.current);
      tileLayerRef.current = null;
    }
    if (labelsLayerRef.current) {
      mapRef.current.removeLayer(labelsLayerRef.current);
      labelsLayerRef.current = null;
    }

    if (mapMode === 'satellite') {
      // Add Google Hybrid Layer (Satellite + Roads + Labels)
      tileLayerRef.current = L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
        attribution: '&copy; Google Maps',
        maxZoom: 20
      }).addTo(mapRef.current);
    } else {
      // Add Clean Google Roadmap Base Layer (Clean streets without red POI icons)
      tileLayerRef.current = L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
        attribution: '&copy; Google Maps',
        maxZoom: 20
      }).addTo(mapRef.current);
    }

    return () => { };
  }, [leafletLoaded, mapMode]);

  // Update markers and route path when filtered logs or selected log changes
  useEffect(() => {
    const L = (window as any).L;
    if (!L || !mapRef.current || !markersGroupRef.current) return;

    // Clear old markers and polyline
    markersGroupRef.current.clearLayers();
    if (polylineRef.current) {
      mapRef.current.removeLayer(polylineRef.current);
      polylineRef.current = null;
    }

    if (filteredLogs.length === 0) return;

    const points: [number, number][] = [];

    filteredLogs.forEach((log) => {
      const isSelected = selectedLog && selectedLog.name === log.name;
      const markerColor = isSelected ? '#ff3333' : '#2196F3';

      const pinSvg = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="30" height="30" style="filter: drop-shadow(0px 2px 4px rgba(0,0,0,0.3));">
          <path fill="${markerColor}" stroke="#ffffff" stroke-width="1.5" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
        </svg>
      `;

      const customIcon = L.divIcon({
        html: pinSvg,
        className: 'custom-pin-marker',
        iconSize: [30, 30],
        iconAnchor: [15, 30],
        popupAnchor: [0, -30]
      });

      const marker = L.marker([log.latitude, log.longitude], {
        icon: customIcon
      });

      marker.bindPopup(`
        <strong>Source:</strong> ${log.source}<br/>
        <strong>Status:</strong> ${log.status}<br/>
        <strong>Logged At:</strong> ${fDateTime(log.logged_at)}<br/>
        <strong>Accuracy:</strong> ${log.accuracy ? `${log.accuracy}m` : 'N/A'}
      `);

      markersGroupRef.current.addLayer(marker);
      points.push([log.latitude, log.longitude]);
    });

    // Draw route path
    if (points.length > 1) {
      // Add white outline casing line for maximum contrast over map tiles
      L.polyline(points, {
        color: '#FFFFFF',
        weight: 8,
        opacity: 0.9,
      }).addTo(markersGroupRef.current);

      // Main prominent route line
      polylineRef.current = L.polyline(points, {
        color: '#0062FF',
        weight: 5,
        opacity: 1,
        dashArray: '8, 6',
      }).addTo(mapRef.current);
    }

    // Set view to selected log, or fit bounds with close zoom
    if (selectedLog) {
      mapRef.current.setView([selectedLog.latitude, selectedLog.longitude], 17);
    } else {
      mapRef.current.fitBounds(markersGroupRef.current.getBounds(), { padding: [50, 50], maxZoom: 17 });
    }
  }, [filteredLogs, selectedLog, leafletLoaded]);

  const handleSelectLog = (log: LocationLog) => {
    setSelectedLog(log);
    if (mapRef.current) {
      mapRef.current.setView([log.latitude, log.longitude], 17, { animate: true });
    }
  };

  return (
    <Box sx={{ mt: 1 }}>
      {/* Top Filter Bar */}
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        alignItems={{ xs: 'stretch', md: 'center' }}
        justifyContent="flex-start"
        sx={{ mb: 2.5, width: '100%', flexWrap: 'wrap' }}
      >
        <FormControl size="medium" sx={{ width: { xs: '100%', sm: 220 } }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={statusFilter}
            label="Status"
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <MenuItem value="all">All Statuses</MenuItem>
            <MenuItem value="Available">Available - Logged In</MenuItem>
            <MenuItem value="Busy">In Client Meeting</MenuItem>
            <MenuItem value="Do Not Disturb">Team Discussion</MenuItem>
            <MenuItem value="Break">Lunch Break</MenuItem>
            <MenuItem value="Away">Break</MenuItem>
            <MenuItem value="Offline">Offline - Logout</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="medium" sx={{ width: { xs: '100%', sm: 200 } }}>
          <InputLabel>Source</InputLabel>
          <Select
            value={sourceFilter}
            label="Source"
            onChange={(e) => setSourceFilter(e.target.value)}
          >
            <MenuItem value="all">All Sources</MenuItem>
            <MenuItem value="Login">Login</MenuItem>
            <MenuItem value="Logout">Logout</MenuItem>
            <MenuItem value="Status Change">Status Change</MenuItem>
            <MenuItem value="Auto Tracking">Auto Tracking</MenuItem>
          </Select>
        </FormControl>

        <MobileTimePicker
          label="Start Time"
          value={startTimeFilter}
          onChange={handleStartTimeChange}
          maxTime={endTimeFilter || undefined}
          slotProps={{ 
            textField: { 
              size: 'medium',
              sx: { width: { xs: '100%', sm: 180 } }
            } 
          }}
        />

        <MobileTimePicker
          label="End Time"
          value={endTimeFilter}
          onChange={handleEndTimeChange}
          minTime={startTimeFilter || undefined}
          slotProps={{ 
            textField: { 
              size: 'medium',
              sx: { width: { xs: '100%', sm: 180 } }
            } 
          }}
        />

        {hasAnyFilter && (
          <Button
            color="error"
            variant="outlined"
            onClick={handleClearAllFilters}
            startIcon={<Iconify icon="solar:trash-bin-trash-bold" />}
            sx={{
              alignSelf: { xs: 'stretch', md: 'center' },
              fontWeight: 700,
              px: 2.5,
              borderRadius: 1.5,
              height: 40, // Matches the height of outline select and time picker components
              textTransform: 'none',
              borderColor: (theme) => alpha(theme.palette.error.main, 0.48),
              '&:hover': {
                borderColor: 'error.main',
                bgcolor: (theme) => alpha(theme.palette.error.main, 0.08),
              }
            }}
          >
            Clear Filters
          </Button>
        )}
      </Stack>

      <Grid container spacing={3}>
        {/* Map & Detail View */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Card sx={{ height: 500, position: 'relative' }}>
            <div
              ref={mapContainerRef}
              style={{ width: '100%', height: '100%', zIndex: 1 }}
            />
            {selectedLog && (
              <Stack direction="row" spacing={1} sx={{ position: 'absolute', bottom: 16, right: 16, zIndex: 1000 }}>
                {/* Layer Toggle Button */}
                <Tooltip title={mapMode === 'satellite' ? "Switch to Streets View" : "Switch to Satellite View"} arrow>
                  <IconButton
                    onClick={() => setMapMode(prev => prev === 'streets' ? 'satellite' : 'streets')}
                    sx={{
                      bgcolor: 'background.paper',
                      boxShadow: (theme) => theme.customShadows.z8,
                      color: 'text.primary',
                      '&:hover': {
                        bgcolor: 'background.neutral',
                      }
                    }}
                  >
                    <Iconify icon={(mapMode === 'satellite' ? "solar:map-bold" : "solar:earth-bold") as any} width={20} />
                  </IconButton>
                </Tooltip>

                {/* Center Map Button */}
                <Tooltip title="Center on Selected Log Location" arrow>
                  <IconButton
                    onClick={() => {
                      if (mapRef.current) {
                        mapRef.current.setView([selectedLog.latitude, selectedLog.longitude], 17, { animate: true });
                      }
                    }}
                    sx={{
                      bgcolor: 'background.paper',
                      boxShadow: (theme) => theme.customShadows.z8,
                      color: 'text.primary',
                      '&:hover': {
                        bgcolor: 'background.neutral',
                      }
                    }}
                  >
                    <Iconify icon={"solar:gps-bold" as any} width={20} />
                  </IconButton>
                </Tooltip>
              </Stack>
            )}
            {!leafletLoaded && (
              <Box sx={{
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                bgcolor: 'background.paper', display: 'flex', alignItems: 'center',
                justifyContent: 'center', zIndex: 10
              }}>
                <Typography>Loading Map Component...</Typography>
              </Box>
            )}
          </Card>
        </Grid>

        {/* Timeline View */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ height: 500, display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ p: 3, pb: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Location History</Typography>
            </CardContent>

            <Divider />

            <Box sx={{ flexGrow: 1, overflowY: 'auto', px: 3, py: 2 }}>
              {filteredLogs.length === 0 ? (
                <Box sx={{ py: 4, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">No location logs match your filters.</Typography>
                </Box>
              ) : (
                <Timeline
                  sx={{
                    [`& .${timelineItemClasses.root}:before`]: {
                      flex: 0,
                      padding: 0,
                    },
                    p: 0
                  }}
                >
                  {[...filteredLogs].reverse().map((log) => {
                    const isSelected = selectedLog && selectedLog.name === log.name;
                    return (
                      <TimelineItem
                        key={log.name}
                        onClick={() => handleSelectLog(log)}
                        sx={{ cursor: 'pointer' }}
                      >
                        <TimelineSeparator>
                          <TimelineDot
                            color={isSelected ? 'error' : 'primary'}
                            variant={isSelected ? 'filled' : 'outlined'}
                          />
                          <TimelineConnector />
                        </TimelineSeparator>
                        <TimelineContent sx={{ pb: 2 }}>
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <Typography variant="subtitle2" sx={{ fontWeight: isSelected ? 800 : 600 }}>
                              {log.source} ({STATUS_DISPLAY_MAP[log.status || ''] || log.status})
                            </Typography>
                            {!!log.accuracy && log.accuracy > 100 && (
                              <Chip
                                label={`±${Math.round(log.accuracy)}m`}
                                size="small"
                                color="warning"
                                sx={{ height: 18, fontSize: '0.6875rem', fontWeight: 700, px: 0.5 }}
                              />
                            )}
                          </Stack>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                            {fDateTime(log.logged_at)}
                          </Typography>
                          <TimelineItemAddress log={log} />
                        </TimelineContent>
                      </TimelineItem>
                    );
                  })}
                </Timeline>
              )}
            </Box>
          </Card>
        </Grid>

        {/* Logged Details (Full Width) */}
        {selectedLog && (
          <Grid size={{ xs: 12 }}>
            {(() => {
              const uaInfo = parseUserAgent(selectedLog.device_type);
              const deviceDisplay = uaInfo.browser ? `${uaInfo.os} • ${uaInfo.browser}` : uaInfo.os;
              return (
                <Card sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{ mb: 2.5, fontWeight: 800 }}>Logged Details</Typography>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                      {renderDetailItem(
                        "Coordinates",
                        `${selectedLog.latitude.toFixed(6)}, ${selectedLog.longitude.toFixed(6)}`,
                        "solar:map-point-bold-duotone",
                        "primary.main"
                      )}
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                      {renderDetailItem(
                        "GPS Accuracy",
                        selectedLog.accuracy ? `${selectedLog.accuracy} meters` : 'N/A',
                        "solar:gps-bold-duotone",
                        "warning.main"
                      )}
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                      {renderDetailItem(
                        "Status",
                        <Chip
                          label={selectedLog.status}
                          size="small"
                          color={selectedLog.status === 'Available' ? 'success' : 'default'}
                          sx={{ fontWeight: 700 }}
                        />,
                        "solar:user-bold-duotone",
                        "success.main"
                      )}
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                      {renderDetailItem(
                        "Tracking Source",
                        selectedLog.source || 'N/A',
                        "solar:login-bold-duotone",
                        "info.main"
                      )}
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                      {renderDetailItem(
                        "Logged At",
                        fDateTime(selectedLog.logged_at),
                        "solar:calendar-date-bold-duotone",
                        "secondary.main"
                      )}
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                      {renderDetailItem(
                        "IP Address",
                        selectedLog.ip_address || 'N/A',
                        "solar:global-bold-duotone",
                        "text.secondary"
                      )}
                    </Grid>

                    <Grid size={{ xs: 12 }}>
                      <Tooltip title={selectedLog.device_type || 'N/A'} arrow>
                        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ p: 2, borderRadius: 1.5, bgcolor: 'background.neutral', border: (theme) => `1px solid ${alpha(theme.palette.divider, 0.5)}`, cursor: 'help' }}>
                          <Box
                            sx={{
                              width: 36,
                              height: 36,
                              borderRadius: 1,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                              color: "text.primary",
                            }}
                          >
                            <Iconify icon={uaInfo.icon as any} width={20} />
                          </Box>
                          <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', mb: 0.25 }}>
                              Device info (Hover for User Agent)
                            </Typography>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                              {deviceDisplay}
                            </Typography>
                          </Box>
                        </Stack>
                      </Tooltip>
                    </Grid>
                  </Grid>
                </Card>
              );
            })()}
          </Grid>
        )}
      </Grid>
    </Box>
  );
}
