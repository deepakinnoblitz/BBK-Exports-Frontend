import { useRef, useState, useEffect } from 'react';

import { alpha, styled, keyframes } from '@mui/material/styles';
import { GaugeValueArc, useGaugeState, GaugeContainer, GaugeReferenceArc } from '@mui/x-charts/Gauge';

interface PersonalityGaugeProps {
    value: number;
    width?: number;
    height?: number;
}

function GaugePointer({ color }: { color: string }) {
    const { valueAngle, outerRadius, cx, cy } = useGaugeState();

    if (valueAngle === null) {
        return null;
    }

    const target = {
        x: cx + outerRadius * Math.sin(valueAngle),
        y: cy - outerRadius * Math.cos(valueAngle),
    };

    return (
        <g>

            <circle cx={cx} cy={cy} r={10} fill={alpha(color, 0.2)} />
            <circle cx={cx} cy={cy} r={6} fill={color} />
            <path
                d={`M ${cx} ${cy} L ${target.x} ${target.y}`}
                stroke={color}
                strokeWidth={4}
                strokeLinecap="round"
                style={{ transition: 'none' }}
            />
        </g>
    );
}

function GaugeDecorations() {
    const { cx, cy, outerRadius, innerRadius } = useGaugeState();

    // Fallback if state not ready or innerRadius missing
    const actualInnerRadius = innerRadius ?? outerRadius * 0.75;
    const thickness = outerRadius - actualInnerRadius;
    const centerRadius = outerRadius - thickness / 2;

    const markers = [10, 20, 30, 40, 50, 60, 70, 80, 90];
    const internalLabels = [
        { v: 0, angle: -106 },
        { v: 100, angle: 106 }
    ];

    return (
        <g>
            {/* White segment dividers */}
            {markers.map((m) => {
                const angle = -110 + (m / 100) * 220;
                const rad = ((angle - 90) * Math.PI) / 180;
                return (
                    <line
                        key={`line-${m}`}
                        x1={cx + actualInnerRadius * Math.cos(rad)}
                        y1={cy + actualInnerRadius * Math.sin(rad)}
                        x2={cx + outerRadius * Math.cos(rad)}
                        y2={cy + outerRadius * Math.sin(rad)}
                        stroke="rgba(255,255,255,0.4)"
                        strokeWidth={2}
                    />
                );
            })}

            {/* Internal White Labels (0, 100) */}
            {internalLabels.map((item) => {
                const rad = ((item.angle - 90) * Math.PI) / 180;
                const x = cx + centerRadius * Math.cos(rad);
                const y = cy + centerRadius * Math.sin(rad);
                return (
                    <text
                        key={`int-lbl-${item.v}`}
                        x={x}
                        y={y}
                        textAnchor="middle"
                        dominantBaseline="central"
                        style={{
                            fontSize: '11px',
                            fill: '#ffffff',
                            fontWeight: 900,
                            pointerEvents: 'none'
                        }}
                    >
                        {item.v}
                    </text>
                );
            })}
        </g>
    );
}

const pulse = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
`;

const GaugeWrapper = styled('div')(({ theme }) => ({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing(1, 2, 4, 2), // Top, Right, Bottom, Left (Increased bottom padding)
    '& .score-container': {
        marginTop: theme.spacing(-5), // Pull text up into the gauge's whitespace
    }
}));


export default function PersonalityGauge({ value, width = 300, height = 300 }: PersonalityGaugeProps) {
    const [displayValue, setDisplayValue] = useState(0);
    const [inView, setInView] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                setInView(entry.isIntersecting);
            },
            { threshold: 0.1 }
        );

        if (containerRef.current) {
            observer.observe(containerRef.current);
        }

        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (!inView) {
            setDisplayValue(0);
            return () => { };
        }

        let startTimestamp: number | null = null;
        let animationFrameId: number;
        const duration = 1000; // Exact 1 second sweep as requested
        const startValue = 0;
        const endValue = Math.abs(value);

        const step = (timestamp: number) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);

            // Ease out quad for a smooth finish
            const easedProgress = 1 - (1 - progress) * (1 - progress);

            setDisplayValue(easedProgress * (endValue - startValue) + startValue);

            if (progress < 1) {
                animationFrameId = window.requestAnimationFrame(step);
            }
        };

        animationFrameId = window.requestAnimationFrame(step);

        return () => {
            if (animationFrameId) {
                window.cancelAnimationFrame(animationFrameId);
            }
        };
    }, [inView, value]);

    // Use a separate constant for the Gauge components to use CSS transition
    const gaugeValue = inView ? Math.abs(value) : 0;

    const absValue = Math.abs(value);

    // Dynamic color matching the user's 6-segment split
    const getColor = (val: number) => {
        const v = Math.min(Math.max(val, 0), 100);
        if (v < 16.6) return '#3b82f6'; // Blue
        if (v < 33.3) return '#06b6d4'; // Cyan
        if (v < 50.0) return '#4ade80'; // Light Green
        if (v < 66.6) return '#84cc16'; // Lime
        if (v < 83.3) return '#a3e635'; // Lime green
        return '#22c55e'; // Green
    };

    const currentColor = getColor(absValue);

    return (
        <GaugeWrapper ref={containerRef}>

            <svg width={0} height={0} style={{ position: 'absolute' }}>
                <defs>
                    <linearGradient id="personality-gauge-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#3b82f6" />
                        <stop offset="16.6%" stopColor="#06b6d4" />
                        <stop offset="33.3%" stopColor="#4ade80" />
                        <stop offset="50%" stopColor="#84cc16" />
                        <stop offset="66.6%" stopColor="#a3e635" />
                        <stop offset="83.3%" stopColor="#76e050" />
                        <stop offset="100%" stopColor="#22c55e" />
                    </linearGradient>
                </defs>
            </svg>
            <GaugeContainer
                width={width}
                height={height * 0.72} // Slightly more height to avoid any clipping
                startAngle={-110}
                endAngle={110}
                value={displayValue}
                max={100}
                innerRadius="75%"
                skipAnimation
                sx={{
                    overflow: 'visible',
                    '& .MuiGauge-valueArc': {
                        fill: 'url(#personality-gauge-gradient)',
                        transition: 'none !important',
                        animation: 'none !important',
                    },
                    '& .MuiGauge-referenceArc': {
                        transition: 'none !important',
                        animation: 'none !important',
                    },
                    '& path': {
                        transition: 'none !important',
                        animation: 'none !important',
                    },
                }}
            >
                <GaugeReferenceArc fill="#f1f5f9" />
                <GaugeValueArc skipAnimation />
                <GaugePointer color={currentColor} />
                <GaugeDecorations />
            </GaugeContainer>



            <div className="score-container">
                <div style={{
                    fontSize: '2rem',
                    fontWeight: 900,
                    marginTop: 50,
                    color: currentColor,
                    textShadow: `0 0 20px ${alpha(currentColor, 0.4)}`,
                    textAlign: 'center',
                    lineHeight: 1
                }}>
                    {Math.round(displayValue)}
                    <span style={{ fontSize: '1rem', opacity: 0.6, marginLeft: '8px', fontWeight: 600 }}>/ 100</span>
                </div>

                <div style={{ fontSize: '0.8rem', color: '#64748b', textAlign: 'center', marginTop: '2px', fontWeight: 600 }}>Current Score</div>
            </div>
        </GaugeWrapper>
    );
}