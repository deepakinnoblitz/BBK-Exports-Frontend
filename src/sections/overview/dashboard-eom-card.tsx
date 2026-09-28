import { useMemo, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

import { fetchLatestPublishedEom, type EmployeeMonthlyAward } from 'src/api/eom';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export function DashboardEomCard() {
    const theme = useTheme();
    const [award, setAward] = useState<EmployeeMonthlyAward | null>(null);
    const [employee, setEmployee] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const currentDay = new Date().getDate();

    useEffect(() => {
        const loadData = async () => {
            try {
                const latestAward = await fetchLatestPublishedEom();
                if (latestAward) {
                    setAward(latestAward);
                    // Use the employee data directly from the award response (embedded by backend)
                    setEmployee({
                        employee_name: latestAward.employee_name || '',
                        designation: latestAward.designation || '',
                        profile_picture: latestAward.profile_picture || '',
                        name: latestAward.employee,
                        employee_id: '',
                        email: '',
                        status: 'Active'
                    });
                }
            } catch (error) {
                console.error('Error loading EOM data:', error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, []);

    const sparkles = useMemo(() => {
        const generate = (count: number, minOffset: number, maxOffset: number) => [...Array(count)].map(() => ({
            top: `${Math.random() * 80 + 10}%`,
            offset: `${Math.random() * (maxOffset - minOffset) + minOffset}%`,
            delay: `${Math.random() * 3}s`,
            size: Math.random() * 15 + 10,
        }));
        return {
            left: generate(3, 5, 25),
            middle: generate(4, 30, 70),
            right: generate(3, 5, 25),
        };
    }, []);

    if (!award || !employee) {
        return null;
    }

    if (loading) return null;

    // Visibility Logic: Only render if current day is within the configured display days
    if (currentDay > (award.display_days || 5)) {
        return null;
    }

    const monthName = new Date(award.month).toLocaleString('default', { month: 'long', year: 'numeric' });

    return (
        <Card
            sx={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                flexDirection: 'row',
                position: 'relative',
                overflow: 'hidden',
                background: `linear-gradient(135deg, #FFFFFF 0%, ${alpha('#FFD700', 0.05)} 50%, ${alpha(theme.palette.primary.lighter || '#E3F2FD', 0.1)} 100%)`,
                boxShadow: (themeVar) => `0 12px 24px -4px ${alpha('#D4AF37', 0.3)}, 0 4px 8px -2px ${alpha('#000', 0.05)}`,
                borderRadius: 2.5,
                mb: 3,
                minHeight: 180,
                border: `1px solid ${alpha('#D4AF37', 0.4)}`,
            }}
        >
            
            {/* Background Sparkles Left */}
            {sparkles.left.map((s, i) => (
                <Box
                    key={`left-${i}`}
                    sx={{
                        position: 'absolute',
                        top: s.top,
                        left: s.offset,
                        opacity: 0.2,
                        color: '#F9D71C',
                        animation: `pulse 3s infinite ease-in-out ${s.delay}`,
                        '@keyframes pulse': {
                            '0%, 100%': { transform: 'scale(1)', opacity: 0.2 },
                            '50%': { transform: 'scale(1.3)', opacity: 0.4 },
                        },
                    }}
                >
                    <Iconify icon="solar:medal-star-bold" width={s.size} />
                </Box>
            ))}

            {/* Background Sparkles Middle */}
            {sparkles.middle.map((s, i) => (
                <Box
                    key={`middle-${i}`}
                    sx={{
                        position: 'absolute',
                        top: s.top,
                        left: s.offset,
                        opacity: 0.15,
                        color: '#F9D71C',
                        animation: `pulse 3s infinite ease-in-out ${s.delay}`,
                        zIndex: 0,
                        '@keyframes pulse': {
                            '0%, 100%': { transform: 'scale(1)', opacity: 0.15 },
                            '50%': { transform: 'scale(1.3)', opacity: 0.3 },
                        },
                    }}
                >
                    <Iconify icon="solar:medal-star-bold" width={s.size} />
                </Box>
            ))}

            {/* Background Sparkles Right */}
            {sparkles.right.map((s, i) => (
                <Box
                    key={`right-${i}`}
                    sx={{
                        position: 'absolute',
                        top: s.top,
                        right: s.offset,
                        opacity: 0.2,
                        color: '#F9D71C',
                        animation: `pulse 3s infinite ease-in-out ${s.delay}`,
                        '@keyframes pulse': {
                            '0%, 100%': { transform: 'scale(1)', opacity: 0.2 },
                            '50%': { transform: 'scale(1.3)', opacity: 0.4 },
                        },
                    }}
                >
                    <Iconify icon="solar:medal-star-bold" width={s.size} />
                </Box>
            ))}

            {/* Top Gold Ribbon - High-Fidelity Image */}
            <Box
                sx={{
                    position: 'absolute',
                    top: -10, // Overlap top for majestic 3D effect
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 10,
                    pointerEvents: 'none',
                }}
            >
                <Box
                    component="img"
                    src={`${import.meta.env.BASE_URL}assets/eom-ribbon.png`}
                    alt="Employee of the Month"
                    sx={{
                        width: 240,
                        height: 'auto',
                        filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.15)) contrast(1.1)',
                        mixBlendMode: 'multiply',
                    }}
                />
            </Box>

            {/* Left: Avatar & High-Fidelity Trophy */}
            <Box sx={{ position: 'relative', mr: 5, ml: 4 }}>
                <Avatar
                    src={employee.profile_picture}
                    alt={employee.employee_name}
                    sx={{
                        width: 120,
                        height: 120,
                        border: '3px solid #D4AF37',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                    }}
                />

                <Box
                    sx={{
                        position: 'absolute',
                        bottom: -16,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        px: 2,
                        py: 0.6,
                        borderRadius: '999px',
                        background: 'linear-gradient(135deg, #FFFDE7, #FFF8E1)',
                        color: '#B8860B',
                        fontSize: 12,
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.8,
                        whiteSpace: 'nowrap',
                        backdropFilter: 'blur(6px)',
                        boxShadow: `0 6px 16px ${alpha('#D4AF37', 0.25)}`,
                        border: `1px solid ${alpha('#D4AF37', 0.2)}`,
                        letterSpacing: '0.3px',
                    }}
                >
                    <Iconify icon={"solar:cup-star-bold" as any} width={16} />
                    Top Performer
                </Box>
            </Box>

            {/* Middle: Details */}
            <Box sx={{ position: 'relative', flexGrow: 1, display: 'flex', alignItems: 'center' }}>
                {/* Background Trophy Watermark */}
                <Iconify
                    icon="solar:cup-star-bold-duotone"
                    sx={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        zIndex: -1,
                        opacity: 0.05,
                        color: '#D4AF37',
                        width: 180,
                        height: 180,
                    }}
                />
                <Stack spacing={0} sx={{ mt: { xs: 6, md: 5 }, pb: 3, width: '100%', maxWidth: { md: 280, xs: 200 } }}>
                    <Typography
                        variant="overline"
                        sx={{
                            color: '#D4AF37',
                            fontWeight: 900,
                            fontSize: '1.15rem',
                            letterSpacing: 0.5,
                            mb: 0.5,
                        }}
                    >
                        {monthName}
                    </Typography>

                    <Typography
                        variant="h3"
                        sx={{
                            fontWeight: 600,
                            color: '#161C24',
                            lineHeight: 1.2,
                            fontFamily: 'Poppins, sans-serif',
                            wordBreak: 'break-word',
                            overflowWrap: 'anywhere',
                            mb: 0.5,
                        }}
                    >
                        {employee.employee_name}
                    </Typography>

                    <Typography variant="subtitle1" sx={{ color: 'text.secondary', fontWeight: 600, opacity: 0.8, lineHeight: 1.2 }}>
                        {employee.designation || 'Team Member'}
                    </Typography>
                </Stack>
            </Box>

            {/* Right side: Points Badge */}
            <Box sx={{ mr: 4, ml: 2 }}>
                <Box
                    sx={{
                        px: 2.5,
                        py: 1.25,
                        borderRadius: 10,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: alpha('#D4AF37', 0.1),
                        border: '2px solid #D4AF37',
                        minWidth: 140,
                    }}
                >
                    <Iconify icon="solar:medal-star-bold" width={24} sx={{ color: '#D4AF37', mb: 0.5 }} />
                    <Typography variant="caption" sx={{ color: '#B8860B', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.7rem' }}>
                        Monthly Score
                    </Typography>
                    <Typography variant="subtitle1" sx={{ color: '#161C24', fontWeight: 900 }}>
                        + {award.total_score.toFixed(0)} Points
                    </Typography>
                </Box>
            </Box>
        </Card>
    );
}
