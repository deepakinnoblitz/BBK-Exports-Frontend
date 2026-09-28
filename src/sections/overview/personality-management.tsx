import { BsInfoCircle } from "react-icons/bs";
import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import { ClickAwayListener } from '@mui/material';
import Typography from '@mui/material/Typography';
import LinearProgress from "@mui/material/LinearProgress";
import HubRoundedIcon from "@mui/icons-material/HubRounded";
import {  useTheme, keyframes } from '@mui/material/styles';
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import ReportRoundedIcon from "@mui/icons-material/ReportRounded";
import GppGoodRoundedIcon from "@mui/icons-material/GppGoodRounded";
import MenuBookRoundedIcon from "@mui/icons-material/MenuBookRounded";
import CategoryRoundedIcon from "@mui/icons-material/CategoryRounded";
import CheckroomRoundedIcon from "@mui/icons-material/CheckroomRounded";
import ChecklistRoundedIcon from "@mui/icons-material/ChecklistRounded";
import ExtensionRoundedIcon from "@mui/icons-material/ExtensionRounded";
import Diversity3RoundedIcon from "@mui/icons-material/Diversity3Rounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import EmojiObjectsRoundedIcon from "@mui/icons-material/EmojiObjectsRounded";
import SupportAgentRoundedIcon from "@mui/icons-material/SupportAgentRounded";
import EventAvailableRoundedIcon from "@mui/icons-material/EventAvailableRounded";
import TipsAndUpdatesRoundedIcon from "@mui/icons-material/TipsAndUpdatesRounded";
import WorkspacePremiumRoundedIcon from "@mui/icons-material/WorkspacePremiumRounded";
import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import KeyboardArrowRightRoundedIcon from "@mui/icons-material/KeyboardArrowRightRounded";
import AssignmentTurnedInRoundedIcon from "@mui/icons-material/AssignmentTurnedInRounded";

import { useRouter } from 'src/routes/hooks';

import { fetchPersonalityDashboardData, type PersonalityDashboardData } from 'src/api/dashboard';

import { Iconify } from 'src/components/iconify';

import PersonalityGauge from 'src/sections/employee-evaluation/component/personality-gauge';

// ----------------------------------------------------------------------

const pulse = keyframes`
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.05); opacity: 0.8; }
  100% { transform: scale(1); opacity: 1; }
`;

const colorPalette = [
    { color: "#f43f5e", bg: "#ffe4e6" },
    { color: "#ea580c", bg: "#ffedd5" },
    { color: "#ca8a04", bg: "#fef3c7" },
    { color: "#16a34a", bg: "#dcfce7" },
    { color: "#2563eb", bg: "#dbeafe" },
    { color: "#7c3aed", bg: "#ede9fe" },
    { color: "#db2777", bg: "#fce7f3" },
    { color: "#0891b2", bg: "#cffafe" },
];

const traitIconMap: Record<string, React.ReactElement> = {
    "Dress Code": <CheckroomRoundedIcon fontSize="small" />,
    "Floor Discipline": <GppGoodRoundedIcon fontSize="small" />,
    "Allegations": <ReportRoundedIcon fontSize="small" />,
    "Discipline": <GppGoodRoundedIcon fontSize="small" />,
    "Learning & Improvement": <MenuBookRoundedIcon fontSize="small" />,
    "Attendance": <EventAvailableRoundedIcon fontSize="small" />,
    "Communication Skills": <SupportAgentRoundedIcon fontSize="small" />,
    "Team Coordination": <Diversity3RoundedIcon fontSize="small" />,
    "Task Completion": <ChecklistRoundedIcon fontSize="small" />,
    "Project Deliverables": <AssignmentTurnedInRoundedIcon fontSize="small" />,
    "Project Contribution": <WorkspacePremiumRoundedIcon fontSize="small" />,
    "Project Coordination": <HubRoundedIcon fontSize="small" />,
};

const defaultIconPool: React.ReactElement[] = [
    <StarRoundedIcon fontSize="small" />,
    <ExtensionRoundedIcon fontSize="small" />,
    <CategoryRoundedIcon fontSize="small" />,
    <TipsAndUpdatesRoundedIcon fontSize="small" />,
    <EmojiObjectsRoundedIcon fontSize="small" />,
    <AutoAwesomeRoundedIcon fontSize="small" />,
    <CheckCircleOutlineRoundedIcon fontSize="small" />,
];

const getTraitConfig = (traitName: string): { color: string; bg: string; icon: React.ReactElement } => {
    if (!traitName) {
        return { ...colorPalette[0], icon: defaultIconPool[0] };
    }
    let hash = 0;
    for (let i = 0; i < traitName.length; i++) {
        hash = traitName.charCodeAt(i) + (hash * 31) - hash;
    }
    const absHash = Math.abs(hash);
    const index = absHash % colorPalette.length;
    const config = colorPalette[index];
    const icon = traitIconMap[traitName] ?? defaultIconPool[absHash % defaultIconPool.length];
    return { ...config, icon };
};

export function PersonalityManagement() {
    const theme = useTheme();
    const router = useRouter();

    const [stats, setStats] = useState<PersonalityDashboardData | null>(null);

    const getDashboardData = useCallback(async () => {
        try {
            const response = await fetchPersonalityDashboardData();
            if (response) {
                setStats(response);
            }
        } catch (error) {
            console.error('Error fetching personality data:', error);
        }
    }, []);


    useEffect(() => {
        getDashboardData();
    }, [getDashboardData]);

    const [isHovered, setIsHovered] = useState(false);
    const [isPinned, setIsPinned] = useState(false);

    const displayTraits = stats?.traits ?? [];
    const totalScore = stats?.totalScore ?? 100;

    const improvementsList = Array.isArray(stats?.howToImprove)
        ? stats.howToImprove.filter(Boolean)
        : stats?.howToImprove
            ? [stats.howToImprove]
            : [];
    const hasImprovements = improvementsList.length > 0;

    const displayBreakdown = [...(stats?.performance_breakdown ?? [])].sort(
        (a, b) => Math.abs(b.impact) - Math.abs(a.impact)
    );
    const recentEvals = stats?.recent_evaluations ?? [];

    const getTraitFromImprovementText = (text: string) => {
        const parts = text.split(" - ");
        if (parts.length < 2) return null;
        const traitPart = parts[1];
        const dateIndex = traitPart.indexOf("(");
        if (dateIndex !== -1) {
            return traitPart.substring(0, dateIndex).trim();
        }
        return traitPart.trim();
    };

    let estimatedScore = totalScore;
    improvementsList.forEach((text) => {
        const traitName = getTraitFromImprovementText(text);
        if (traitName) {
            const traitInfo = displayBreakdown.find((t) => t.trait === traitName);
            if (traitInfo && traitInfo.impact < 0) {
                estimatedScore += Math.abs(traitInfo.impact);
            } else {
                estimatedScore += 5;
            }
        } else {
            estimatedScore += 5;
        }
    });
    estimatedScore = Math.min(100, estimatedScore);

    return (
        <Box
            sx={{
                display: "grid",
                gridTemplateColumns: {
                    xs: "1fr",
                    lg: "420px minmax(0,1fr)",
                },
                gap: 3,
                alignItems: "stretch",
            }}
        >
            {/* Gauge Section */}
            <Card
                sx={{
                    p: 1,
                    borderRadius: 2,
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    boxShadow:
                        theme.palette.mode === "light"
                            ? theme.shadows[8]
                            : theme.shadows[12],
                }}
            >
                <Box
                    sx={{
                        width: "100%",
                        mb: 3,
                        textAlign: "left",
                        m: 2,
                        pr: 3
                    }}
                >
                    <Typography
                        variant="h5"
                        sx={{
                            fontWeight: 700,
                            textAlign: 'center'
                        }}
                    >
                        Employee Evaluation Score
                    </Typography>
                </Box>
                <PersonalityGauge value={totalScore} width={300} height={300} />

                <Stack spacing={0.5} sx={{ mb: 3, textAlign: 'center', mt: -3 }}>
                    <ClickAwayListener onClickAway={() => setIsPinned(false)}>
                        <Box sx={{ display: 'inline-block' }}>
                            <Tooltip
                                title={
                                    hasImprovements ? (
                                        <Box sx={{ p: 0.5 }}>
                                            <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 800, color: '#0e7490', borderBottom: '1px solid rgba(6, 182, 212, 0.3)', pb: 1, fontSize: '0.95rem' }}>
                                                Recommended Improvements
                                            </Typography>
                                            <Stack spacing={2}>
                                                {improvementsList.map((item, i) => {
                                                    const [advice, details] = item.split(' - ');
                                                    return (
                                                        <Box key={i} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                                                            <Box sx={{ minWidth: 8, height: 8, borderRadius: '50%', bgcolor: '#06b6d4', mt: 0.7, boxShadow: '0 0 8px rgba(6, 182, 212, 0.4)' }} />
                                                            <Stack spacing={0.3}>
                                                                <Typography sx={{ fontSize: '0.875rem', fontWeight: 700, color: '#117eb2', lineHeight: 1.4, textAlign: 'left' }}>
                                                                    {advice}
                                                                </Typography>
                                                                {details && (
                                                                    <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#0e7490', opacity: 0.8, textAlign: 'left', fontStyle: 'italic' }}>
                                                                        {details}
                                                                    </Typography>
                                                                )}
                                                            </Stack>
                                                        </Box>
                                                    );
                                                })}
                                            </Stack>
                                        </Box>
                                    ) : (
                                        <Box sx={{ p: 0.5 }}>
                                            <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 800, color: '#166534', borderBottom: '1px solid rgba(34, 197, 94, 0.3)', pb: 1, fontSize: '0.95rem' }}>
                                                Recommended Improvements
                                            </Typography>
                                            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                                                <Iconify icon={"eva:checkmark-circle-2-fill" as any} width={18} sx={{ color: '#22c55e', mt: 0.2 }} />
                                                <Typography sx={{ fontSize: '0.875rem', fontWeight: 700, color: '#15803d', lineHeight: 1.4, textAlign: 'left' }}>
                                                    No improvement suggestions at the moment. Keep up the excellent performance!
                                                </Typography>
                                            </Box>
                                        </Box>
                                    )
                                }
                                arrow
                                placement="top"
                                disableFocusListener
                                disableTouchListener
                                open={isHovered || isPinned}
                                onOpen={() => setIsHovered(true)}
                                onClose={() => setIsHovered(false)}
                                slotProps={{
                                    tooltip: {
                                        sx: {
                                            background: hasImprovements
                                                ? 'linear-gradient(135deg, #f0f9ff 0%, #ecfeff 50%, #f0fdf4 100%)'
                                                : 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                                            color: hasImprovements ? '#117eb2' : '#15803d',
                                            fontSize: '0.875rem',
                                            padding: '16px 24px',
                                            borderRadius: '16px',
                                            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                                            maxWidth: 420,
                                            fontWeight: 700,
                                            lineHeight: 1.6,
                                            textAlign: 'left',
                                            border: hasImprovements ? '1px solid #06b6d4' : '1px solid #22c55e',
                                            backdropFilter: 'blur(10px)',
                                        },
                                    },
                                    arrow: {
                                        sx: {
                                            color: hasImprovements ? '#f0f9ff' : '#f0fdf4',
                                        },
                                    },
                                }}
                            >
                                <Typography
                                    variant="body2"
                                    onClick={() => setIsPinned(!isPinned)}
                                    sx={{
                                        color: 'info.main',
                                        fontWeight: 700,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: 0.8,
                                        animation: `${pulse} 3s infinite ease-in-out`,
                                        pb: 3,
                                        cursor: 'help'
                                    }}
                                >
                                    <BsInfoCircle style={{ fontSize: '1.1rem' }} />
                                    What Needs Improvement?
                                </Typography>
                            </Tooltip>
                        </Box>
                    </ClickAwayListener>
                    <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                        Last Updated:{' '}
                        <Box component="span" sx={{ color: 'text.primary', fontWeight: 700 }}>
                            {stats?.lastUpdated
                                ? new Date(stats.lastUpdated).toLocaleString('en-US', {
                                    month: 'short', day: 'numeric',
                                    hour: '2-digit', minute: '2-digit'
                                })
                                : 'No evaluations yet'}
                        </Box>
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                        Status:{' '}
                        <Box
                            component="span"
                            sx={{
                                fontWeight: 800,
                                color: stats?.status === 'Excellent' ? 'success.main'
                                    : stats?.status === 'Good' ? 'info.main'
                                        : stats?.status === 'Average' ? 'warning.main'
                                            : 'error.main',
                            }}
                        >
                            {stats?.status || 'Excellent'}
                        </Box>
                    </Typography>
                </Stack>
            </Card>

            {/* Performance Breakdown */}
            <Box sx={{ width: '100%' }}>
                <Card
                    sx={{
                        p: 3,
                        borderRadius: 2,
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        boxShadow:
                            theme.palette.mode === "light"
                                ? theme.shadows[8]
                                : theme.shadows[12],
                    }}
                >
                    {/* Header */}
                    <Box
                        display="flex"
                        justifyContent="space-between"
                        alignItems="center"
                        mb={2}
                    >
                        <Typography variant="h6" fontWeight={700}>
                            Performance Breakdown
                        </Typography>
                    </Box>

                    {/* Headings */}
                    <Box
                        sx={{
                            display: "grid",
                            gridTemplateColumns: { xs: "120px 1fr 60px 50px", sm: "180px 1fr 90px 70px" },
                            mb: 1,
                            gap: { xs: 1, sm: 2 },
                        }}
                    >
                        <Box />
                        <Box />
                        <Typography
                            variant="caption"
                            textAlign="center"
                            color="text.secondary"
                            fontWeight={600}
                        >
                            Score
                        </Typography>

                        <Typography
                            variant="caption"
                            textAlign="right"
                            color="text.secondary"
                            fontWeight={600}
                        >
                            Impact
                        </Typography>
                    </Box>

                    {/* Rows */}
                    <Stack spacing={3}>
                        {displayBreakdown.slice(0, 5).map((item) => {
                            const config = getTraitConfig(item.trait);
                            return (
                                <Box
                                    key={item.trait}
                                    sx={{
                                        display: "grid",
                                        gridTemplateColumns: { xs: "120px 1fr 60px 50px", sm: "180px 1fr 90px 70px" },
                                        alignItems: "center",
                                        gap: { xs: 1, sm: 2 },
                                    }}
                                >
                                    {/* Left */}
                                    <Stack direction="row" spacing={1} alignItems="center" sx={{ overflow: 'hidden' }}>
                                        <Box
                                            sx={{
                                                width: { xs: 32, sm: 42 },
                                                height: { xs: 32, sm: 42 },
                                                borderRadius: "50%",
                                                bgcolor: config.bg,
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                color: config.color,
                                                flexShrink: 0,
                                            }}
                                        >
                                            {config.icon}
                                        </Box>

                                        <Typography
                                            fontWeight={600}
                                            fontSize={{ xs: 12, sm: 14 }}
                                            sx={{
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                            }}
                                        >
                                            {item.trait}
                                        </Typography>
                                    </Stack>

                                    {/* Progress */}
                                    <LinearProgress
                                        variant="determinate"
                                        value={item.score}
                                        sx={{
                                            height: { xs: 6, sm: 8 },
                                            borderRadius: 5,
                                            backgroundColor: "#ECEFF3",
                                            "& .MuiLinearProgress-bar": {
                                                borderRadius: 5,
                                                backgroundColor: config.color,
                                            },
                                        }}
                                    />

                                    {/* Score */}
                                    <Typography
                                        textAlign="center"
                                        fontWeight={700}
                                        fontSize={{ xs: 13, sm: 16 }}
                                    >
                                        {item.score}
                                        <Typography
                                            component="span"
                                            fontSize={{ xs: 10, sm: 13 }}
                                            color="text.secondary"
                                        >
                                            {" "}
                                            /100
                                        </Typography>
                                    </Typography>

                                    {/* Impact */}
                                    <Typography
                                        textAlign="right"
                                        fontWeight={700}
                                        color={item.impact > 0 ? "success.main" : item.impact < 0 ? "error.main" : "text.secondary"}
                                        fontSize={{ xs: 14, sm: 18 }}
                                    >
                                        {item.impact > 0 ? "+" : ""}
                                        {item.impact}
                                    </Typography>
                                </Box>
                            );
                        })}
                    </Stack>

                    {/* Footer */}
                    <Box mt={4} textAlign="center">
                        <Button
                            endIcon={<KeyboardArrowRightRoundedIcon />}
                            sx={{
                                textTransform: "none",
                                fontWeight: 600,
                            }}
                            onClick={() => router.push('/employee-evaluation')}
                        >
                            View All Criteria
                        </Button>
                    </Box>
                </Card>
            </Box>

            <Box
                sx={{
                    gridColumn: "1 / -1",      // <-- span both columns
                    display: "grid",
                    gridTemplateColumns: {
                        xs: "1fr",
                        md: "1fr 1fr",
                    },
                    gap: 3,
                    alignItems: "stretch",
                }}
            >
                {/* Recommended Action */}
                <Card
                    sx={{
                        py: 3,
                        px: 3,
                        borderRadius: 3,
                        minHeight: 220,
                        boxShadow: theme.shadows[6],
                    }}
                >
                    <Box
                        display="flex"
                        flexDirection="column"
                        gap={3}
                    >
                        {/* Recommended Actions */}
                        <Box>
                            <Typography
                                variant="h6"
                                fontWeight={700}
                                mb={2.5}
                            >
                                Recommended Actions
                            </Typography>

                            <Stack spacing={2}>
                                {improvementsList.length > 0 ? (
                                    improvementsList.map((text, idx) => (
                                        <Stack
                                            key={idx}
                                            direction="row"
                                            spacing={1.5}
                                            alignItems="center"
                                        >
                                            <CheckCircleOutlineRoundedIcon
                                                sx={{
                                                    color: "#2563eb",
                                                    fontSize: 22,
                                                }}
                                            />
                                            <Typography variant="body2">
                                                <Box component="span" sx={{ fontWeight: 700 }}>
                                                    {text.split(" - ")[0]}
                                                </Box>

                                                {text.includes(" - ") && (
                                                    <Box component="span" sx={{ fontWeight: 500, color: "text.secondary" }}>
                                                        {" - "}
                                                        {text.split(" - ")[1]}
                                                    </Box>
                                                )}
                                            </Typography>
                                        </Stack>
                                    ))
                                ) : (
                                    <Stack
                                        direction="row"
                                        spacing={1.5}
                                        alignItems="center"
                                    >
                                        <CheckCircleOutlineRoundedIcon
                                            sx={{
                                                color: "success.main",
                                                fontSize: 22,
                                            }}
                                        />

                                        <Typography
                                            variant="body2"
                                            sx={{
                                                fontWeight: 500,
                                                color: "text.secondary",
                                            }}
                                        >
                                            No recommended actions. Keep up the good performance!
                                        </Typography>
                                    </Stack>
                                )}
                            </Stack>
                        </Box>

                        {/* Score Improvement */}
                        <Card
                            variant="outlined"
                            sx={{
                                p: 3,
                                borderRadius: 3,
                            }}
                        >
                            <Typography
                                align="center"
                                fontWeight={700}
                                mb={2}
                            >
                                Estimated Score After Improvement
                            </Typography>

                            <Stack
                                direction="row"
                                spacing={1}
                                justifyContent="center"
                                alignItems="center"
                                mb={1}
                            >
                                <Typography
                                    fontSize={36}
                                    fontWeight={800}
                                    color="text.primary"
                                >
                                    {totalScore}
                                </Typography>

                                <ArrowForwardRoundedIcon
                                    sx={{
                                        fontSize: 34,
                                        color: "text.secondary",
                                    }}
                                />

                                <Typography
                                    fontSize={36}
                                    fontWeight={800}
                                    color="success.main"
                                >
                                    {estimatedScore}
                                </Typography>
                            </Stack>

                            <Typography
                                align="center"
                                color="text.secondary"
                                fontSize={14}
                                mb={3}
                            >
                                Great! You can reach a higher level by completing recommendations.
                            </Typography>

                            <Box position="relative">
                                <LinearProgress
                                    variant="determinate"
                                    value={estimatedScore}
                                    sx={{
                                        height: 8,
                                        borderRadius: 5,
                                        bgcolor: "#ECEFF3",
                                        "& .MuiLinearProgress-bar": {
                                            borderRadius: 5,
                                            background:
                                                "linear-gradient(90deg,#F59E0B,#84CC16,#22C55E)",
                                        },
                                    }}
                                />

                                {/* Arrow Pointer showing estimated score */}
                                <Box
                                    sx={{
                                        position: "absolute",
                                        left: `${estimatedScore}%`,
                                        top: -24,
                                        transform: "translateX(-50%)",
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: "center",
                                        zIndex: 2,
                                    }}
                                >
                                    <Box
                                        sx={{
                                            bgcolor: "#3B82F6",
                                            color: "#ffffff",
                                            fontSize: "0.75rem",
                                            fontWeight: 800,
                                            px: 0.9,
                                            py: 0.3,
                                            borderRadius: 0.8,
                                            boxShadow: 2,
                                            lineHeight: 1,
                                        }}
                                    >
                                        {estimatedScore}
                                    </Box>
                                    <Box
                                        sx={{
                                            width: 0,
                                            height: 0,
                                            borderLeft: "5px solid transparent",
                                            borderRight: "5px solid transparent",
                                            borderTop: "5px solid #3B82F6",
                                        }}
                                    />
                                </Box>
                            </Box>
                        </Card>
                    </Box>
                </Card>

                {/* Recent Evaluations */}
                <Box sx={{ width: '100%' }}>
                    <Card
                        sx={{
                            p: 2.5,
                            borderRadius: 2,
                            height: "100%",
                            display: "flex",
                            flexDirection: "column",
                            boxShadow:
                                theme.palette.mode === "light"
                                    ? theme.shadows[8]
                                    : theme.shadows[12],
                        }}
                    >
                        {/* Header */}
                        <Box
                            display="flex"
                            justifyContent="space-between"
                            alignItems="center"
                            mb={1}
                        >
                            <Typography variant="h6" fontWeight={700}>
                                Recent Evaluations
                            </Typography>

                            <Button
                                endIcon={<KeyboardArrowRightRoundedIcon />}
                                sx={{
                                    textTransform: "none",
                                    fontWeight: 600,
                                }}
                                onClick={() => router.push('/employee-evaluation')}
                            >
                                View All Evaluations
                            </Button>
                        </Box>

                        {/* Rows */}
                        <Stack spacing={0}>
                            {recentEvals.length > 0 ? (
                                recentEvals.map((item, index, arr) => {
                                    const config = getTraitConfig(item.trait);
                                    return (
                                        <Box
                                            key={item.name}
                                            sx={{
                                                display: "grid",
                                                gridTemplateColumns: { xs: "40px 85px 1fr 50px", sm: "56px 110px 1fr 70px" },
                                                alignItems: "center",
                                                py: 2,
                                                px: 0.5,
                                                gap: { xs: 1, sm: 1.5 },
                                                borderBottom:
                                                    index !== arr.length - 1
                                                        ? "1px solid rgba(145,158,171,0.12)"
                                                        : "none",
                                            }}
                                        >
                                            {/* Icon */}
                                            <Box
                                                sx={{
                                                    width: { xs: 28, sm: 36 },
                                                    height: { xs: 28, sm: 36 },
                                                    borderRadius: "50%",
                                                    bgcolor: config.bg,
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    color: config.color,
                                                    flexShrink: 0,
                                                }}
                                            >
                                                {config.icon}
                                            </Box>

                                            {/* Date & Time */}
                                            <Box>
                                                <Typography
                                                    variant="subtitle2"
                                                    sx={{
                                                        fontWeight: 700,
                                                        fontSize: { xs: 11, sm: 14 },
                                                        lineHeight: 1.2,
                                                    }}
                                                >
                                                    {item.creation ? new Date(item.creation).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                                                </Typography>

                                                <Typography
                                                    variant="caption"
                                                    color="text.secondary"
                                                    sx={{
                                                        fontSize: { xs: 10, sm: 12 },
                                                    }}
                                                >
                                                    {item.creation ? new Date(item.creation).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : ''}
                                                </Typography>
                                            </Box>

                                            {/* Criteria */}
                                            <Box sx={{ overflow: 'hidden' }}>
                                                <Typography
                                                    sx={{
                                                        fontWeight: 700,
                                                        fontSize: { xs: 12, sm: 15 },
                                                        mb: 0.3,
                                                        whiteSpace: 'nowrap',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                    }}
                                                >
                                                    {item.trait}
                                                </Typography>

                                                <Typography
                                                    variant="body2"
                                                    color="text.secondary"
                                                    sx={{
                                                        fontSize: { xs: 11, sm: 13 },
                                                        whiteSpace: 'nowrap',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                    }}
                                                >
                                                    {item.remarks || "No comments provided"}
                                                </Typography>
                                            </Box>

                                            {/* Impact */}
                                            <Typography
                                                align="right"
                                                sx={{
                                                    fontWeight: 800,
                                                    fontSize: { xs: 14, sm: 18 },
                                                    color:
                                                        item.score_change > 0
                                                            ? "success.main"
                                                            : item.score_change < 0
                                                                ? "error.main"
                                                                : "text.secondary",
                                                }}
                                            >
                                                {item.score_change > 0 ? "+" : ""}
                                                {item.score_change}
                                            </Typography>
                                        </Box>
                                    );
                                })
                            ) : (
                                <Box
                                    sx={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        py: 6,
                                        px: 3,
                                        textAlign: 'center'
                                    }}
                                >
                                    <Box
                                        component="svg"
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 64 64"
                                        sx={{ width: 64, height: 64, mb: 2, color: 'text.disabled', opacity: 0.5 }}
                                    >
                                        <path fill="currentColor" opacity="0.1" d="M18 6h20l12 12v34H18z" />
                                        <path stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" d="M18 6h20l12 12v34a4 4 0 0 1-4 4H22a4 4 0 0 1-4-4V6z" />
                                        <path stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" d="M38 6v12h12" />
                                        <path stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" d="M26 28h12M26 36h12M26 44h8" />
                                    </Box>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.secondary', mb: 0.5 }}>
                                        No Evaluations Found
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: 'text.disabled', maxWidth: 280 }}>
                                        No evaluations have been recorded yet. Traits scores will appear here.
                                    </Typography>
                                </Box>
                            )}
                        </Stack>
                    </Card>
                </Box>
            </Box>
        </Box>
    );
}