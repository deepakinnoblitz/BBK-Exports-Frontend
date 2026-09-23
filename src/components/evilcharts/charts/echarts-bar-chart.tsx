import * as echarts from 'echarts';
import React, {
  useRef,
  useMemo,
  useState,
  Children,
  useEffect,
  isValidElement,
} from 'react';

import Box from '@mui/material/Box';
import { useTheme } from '@mui/material/styles';

// ----------------------------------------------------------------------

export type ChartConfig = Record<
  string,
  {
    label: string;
    colors?: {
      light?: string[];
      dark?: string[];
    };
    color?: string;
  }
>;

export type AnimationType = 'left-to-right' | 'right-to-left' | 'center-out' | 'edges-in' | 'none';
export type AnimationEasing = NonNullable<echarts.EChartsOption['animationEasing']>;

export interface BarProps {
  dataKey: string;
  variant?: 'default' | 'glowing' | 'gradient';
  glowing?: boolean;
  isClickable?: boolean;
  radius?: number | [number, number, number, number];
  showValueLabel?: boolean;
  stack?: string;
  barWidth?: string | number;
  animation?: boolean;
  animationType?: AnimationType;
  animationDuration?: number;
  animationEasing?: AnimationEasing;
}

export interface XAxisProps {
  dataKey?: string;
  tickFormatter?: (value: string, index: number) => string;
  label?: string;
  hideDots?: boolean;
}

export interface YAxisProps {
  dataKey?: string;
  tickFormatter?: (value: number | string, index: number) => string;
  label?: string;
  min?: number;
  max?: number;
}

export interface GridProps {
  show?: boolean;
  strokeDasharray?: string;
}

export interface TooltipProps {
  shared?: boolean;
  formatter?: (params: any) => string;
}

export interface LegendProps {
  isClickable?: boolean;
  align?: 'left' | 'center' | 'right';
  verticalAlign?: 'top' | 'middle' | 'bottom';
}

// Sub-components as declarative configuration slots
const Bar: React.FC<BarProps> = () => null;
const XAxis: React.FC<XAxisProps> = () => null;
const YAxis: React.FC<YAxisProps> = () => null;
const Grid: React.FC<GridProps> = () => null;
const Tooltip: React.FC<TooltipProps> = () => null;
const Legend: React.FC<LegendProps> = () => null;

export interface EChartsBarChartProps<TData extends Record<string, unknown> = Record<string, unknown>> {
  data: TData[];
  config: ChartConfig;
  className?: string;
  sx?: any;
  height?: number | string;
  barRadius?: number | [number, number, number, number];
  animation?: boolean;
  animationType?: AnimationType;
  animationDuration?: number;
  animationEasing?: AnimationEasing;
  staggerDelay?: number;
  children?: React.ReactNode;
}

interface ParsedChildren {
  gridConfig: GridProps | null;
  xAxisConfig: XAxisProps | null;
  yAxisConfig: YAxisProps | null;
  tooltipConfig: TooltipProps | null;
  legendConfig: LegendProps | null;
  barConfigs: BarProps[];
}

function getAnimationDelay(
  dataIndex: number,
  totalItems: number,
  animationType: AnimationType = 'left-to-right',
  barIndex = 0,
  staggerMs = 70
): number {
  if (animationType === 'none' || totalItems <= 0) return 0;

  let orderIndex = dataIndex;
  if (animationType === 'right-to-left') {
    orderIndex = Math.max(0, totalItems - 1 - dataIndex);
  } else if (animationType === 'center-out') {
    const center = (totalItems - 1) / 2;
    orderIndex = Math.abs(dataIndex - center);
  } else if (animationType === 'edges-in') {
    const center = (totalItems - 1) / 2;
    orderIndex = Math.max(0, center - Math.abs(dataIndex - center));
  }

  return Math.round(orderIndex * staggerMs + barIndex * (staggerMs * 0.4));
}

export function EChartsBarChart<TData extends Record<string, unknown>>({
  data,
  config,
  className,
  sx,
  height = 320,
  barRadius = [6, 6, 0, 0],
  animation = true,
  animationType = 'left-to-right',
  animationDuration = 700,
  animationEasing = 'cubicOut',
  staggerDelay = 40,
  children,
}: EChartsBarChartProps<TData>) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const [isAnimationFinished, setIsAnimationFinished] = useState(false);

  useEffect(() => {
    setIsAnimationFinished(false);
    const animTime = (animationDuration || 700) + (data.length * (staggerDelay || 40)) + 60;
    const timer = setTimeout(() => {
      setIsAnimationFinished(true);
    }, animTime);
    return () => clearTimeout(timer);
  }, [data, animationDuration, staggerDelay]);

  const childrenHash = useMemo(() => {
    let hash = '';
    Children.forEach(children, (child) => {
      if (isValidElement(child)) {
        hash += JSON.stringify(child.props);
      }
    });
    return hash;
  }, [children]);

  // Parse compound children props stably
  const parsedChildren = useMemo<ParsedChildren>(() => {
    let gridConfig: GridProps | null = null;
    let xAxisConfig: XAxisProps | null = null;
    let yAxisConfig: YAxisProps | null = null;
    let tooltipConfig: TooltipProps | null = null;
    let legendConfig: LegendProps | null = null;
    const barConfigs: BarProps[] = [];

    Children.forEach(children, (child) => {
      if (!isValidElement(child)) return;

      const childProps = child.props as any;
      if (child.type === Bar) {
        barConfigs.push(childProps as BarProps);
      } else if (child.type === XAxis) {
        xAxisConfig = childProps as XAxisProps;
      } else if (child.type === YAxis) {
        yAxisConfig = childProps as YAxisProps;
      } else if (child.type === Grid) {
        gridConfig = childProps as GridProps;
      } else if (child.type === Tooltip) {
        tooltipConfig = childProps as TooltipProps;
      } else if (child.type === Legend) {
        legendConfig = childProps as LegendProps;
      }
    });

    return { gridConfig, xAxisConfig, yAxisConfig, tooltipConfig, legendConfig, barConfigs };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childrenHash]);

  // Build ECharts option
  const options = useMemo(() => {
    const { gridConfig, xAxisConfig, yAxisConfig, tooltipConfig, legendConfig, barConfigs } = parsedChildren;

    // Categories for X-Axis
    const xKey = (xAxisConfig?.dataKey || 'date') as string;
    const categories = data.map((d, index) => {
      const rawVal = String((d as any)[xKey] ?? '');
      return xAxisConfig?.tickFormatter ? xAxisConfig.tickFormatter(rawVal, index) : rawVal;
    });

    // Helper to extract series color
    const getSeriesColor = (key: string) => {
      const conf = config[key];
      if (!conf) return '#10b981';
      if (conf.color) return conf.color;
      const palette = isDarkMode ? conf.colors?.dark : conf.colors?.light;
      if (palette && palette.length > 0) return palette;
      return conf.colors?.light?.[0] || conf.colors?.dark?.[0] || '#10b981';
    };

    // Series construction
    const series = barConfigs.map((bar, barIndex) => {
      const colorVal = getSeriesColor(bar.dataKey);
      const isGlowing = bar.glowing ?? (bar.variant === 'glowing');
      const seriesRadius = bar.radius ?? barRadius;

      let fillStyle: any;
      let primaryColor: string;

      if (Array.isArray(colorVal) && colorVal.length > 1) {
        primaryColor = colorVal[0];
        const stops = colorVal.map((col, idx) => ({
          offset: idx / (colorVal.length - 1),
          color: col,
        }));
        fillStyle = new echarts.graphic.LinearGradient(0, 0, 0, 1, stops);
      } else {
        const singleColor = Array.isArray(colorVal) ? colorVal[0] : colorVal;
        primaryColor = singleColor;
        fillStyle = singleColor;
      }

      // Convert hex to rgba for shadow
      const getGlowColor = (hex: string, alpha = 0.4) => {
        let cleanHex = hex.replace('#', '');
        if (cleanHex.length === 3) {
          cleanHex = cleanHex.split('').map((c) => c + c).join('');
        }
        const r = parseInt(cleanHex.substring(0, 2), 16) || 0;
        const g = parseInt(cleanHex.substring(2, 4), 16) || 0;
        const b = parseInt(cleanHex.substring(4, 6), 16) || 0;
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
      };

      const glowColor = getGlowColor(primaryColor, 0.4);
      const seriesData = data.map((d) => Number(d[bar.dataKey] ?? 0));

      const isBarAnimated = (animation ?? true) && (bar.animation ?? true);
      const barAnimType = bar.animationType || animationType;
      const barDuration = bar.animationDuration ?? animationDuration;
      const barEasing = bar.animationEasing ?? animationEasing;

      return {
        name: config[bar.dataKey]?.label || bar.dataKey,
        type: 'bar',
        data: seriesData,
        stack: bar.stack,
        barMaxWidth: bar.barWidth || 32,
        cursor: bar.isClickable ? 'pointer' : 'default',
        itemStyle: {
          borderRadius: seriesRadius,
          color: fillStyle,
          ...(isGlowing && isAnimationFinished && {
            shadowBlur: 8,
            shadowColor: glowColor,
            shadowOffsetY: 1,
          }),
        },
        emphasis: {
          focus: 'series',
          itemStyle: {
            opacity: 1,
            shadowBlur: 14,
            shadowColor: glowColor,
          },
        },
        blur: {
          itemStyle: {
            opacity: 0.65,
          },
        },
        label: {
          show: bar.showValueLabel ?? true,
          position: 'top',
          distance: 6,
          formatter: (params: any) => (params.value > 0 ? params.value : 0),
          fontSize: 12,
          fontWeight: 700,
          color: isDarkMode ? '#FFFFFF' : primaryColor,
        },
        animation: isBarAnimated,
        animationDuration: barDuration,
        animationEasing: barEasing,
        animationDelay: isBarAnimated
          ? (dataIndex: number) => getAnimationDelay(dataIndex, data.length, barAnimType, barIndex, staggerDelay)
          : 0,
        animationDurationUpdate: 500,
        animationEasingUpdate: barEasing,
        animationDelayUpdate: isBarAnimated
          ? (dataIndex: number) => getAnimationDelay(dataIndex, data.length, barAnimType, barIndex, staggerDelay * 0.5)
          : 0,
      };
    });

    const isGridShown = gridConfig !== null;
    const isLegendShown = legendConfig !== null;
    const isTooltipShown = tooltipConfig !== null;

    const textColor = isDarkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(30, 41, 59, 0.7)';
    const splitLineColor = isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(145, 158, 171, 0.16)';

    return {
      animation: animation ?? true,
      animationThreshold: 2000,
      animationDuration,
      animationEasing,
      animationDurationUpdate: 500,
      animationEasingUpdate: animationEasing,
      backgroundColor: 'transparent',
      grid: {
        left: 10,
        right: 15,
        top: isLegendShown ? 36 : 24,
        bottom: 12,
        containLabel: true,
      },
      legend: isLegendShown
        ? {
            show: true,
            top: 0,
            right: 0,
            selectedMode: legendConfig?.isClickable ?? true,
            textStyle: {
              color: textColor,
              fontWeight: 600,
              fontSize: 12,
            },
            itemWidth: 12,
            itemHeight: 12,
            itemGap: 16,
            borderRadius: 3,
          }
        : { show: false },
      tooltip: isTooltipShown
        ? {
            trigger: 'axis',
            axisPointer: {
              type: 'shadow',
              shadowStyle: {
                color: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(145, 158, 171, 0.18)',
                borderRadius: 4,
              },
            },
            backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
            borderColor: isDarkMode ? '#334155' : '#e2e8f0',
            borderWidth: 1,
            padding: [10, 14],
            textStyle: {
              color: isDarkMode ? '#f8fafc' : '#0f172a',
              fontSize: 12,
            },
            extraCssText: 'box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1); border-radius: 12px;',
            formatter:
              tooltipConfig?.formatter ||
              ((params: any) => {
                if (!Array.isArray(params) || params.length === 0) return '';
                const title = params[0].axisValueLabel || '';
                let content = `<div style="font-weight:700;font-size:12px;margin-bottom:6px;color:${isDarkMode ? '#e2e8f0' : '#334155'};">${title}</div>`;
                params.forEach((item: any) => {
                  const marker = `<span style="display:inline-block;margin-right:6px;border-radius:50%;width:8px;height:8px;background-color:${item.color?.colorStops?.[0]?.color || item.color};"></span>`;
                  content += `<div style="display:flex;align-items:center;justify-content:space-between;gap:16px;margin-top:3px;font-size:12px;">
                    <span>${marker}${item.seriesName}</span>
                    <span style="font-weight:700;">${item.value}</span>
                  </div>`;
                });
                return content;
              }),
          }
        : { show: false },
      xAxis: {
        type: 'category',
        data: categories,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: textColor,
          fontSize: 11,
          fontWeight: 600,
          margin: 12,
        },
      },
      yAxis: {
        type: 'value',
        name: yAxisConfig?.label,
        nameTextStyle: {
          color: textColor,
          fontSize: 11,
          fontWeight: 600,
          padding: [0, 0, 10, 0],
        },
        splitLine: {
          show: isGridShown,
          lineStyle: {
            color: splitLineColor,
            type: 'dashed',
          },
        },
        axisLabel: {
          color: textColor,
          fontSize: 11,
          formatter: yAxisConfig?.tickFormatter
            ? (val: any) => yAxisConfig.tickFormatter!(val, 0)
            : (val: any) => String(Math.round(Number(val) || 0)),
        },
        min: yAxisConfig?.min ?? 0,
        max: yAxisConfig?.max ?? ((value: { max: number }) => Math.max(Math.ceil((value.max || 1) * 1.35), 5)),
      },
      series,
    };
  }, [
    parsedChildren,
    data,
    config,
    isDarkMode,
    barRadius,
    animation,
    animationType,
    animationDuration,
    animationEasing,
    staggerDelay,
    isAnimationFinished,
  ]);

  const prevWidthRef = useRef<number>(0);
  const prevHeightRef = useRef<number>(0);
  const prevDataSignatureRef = useRef<string>('');

  // Mount and update chart
  useEffect(() => {
    if (!chartRef.current) {
      return undefined;
    }

    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
      prevWidthRef.current = chartRef.current.clientWidth;
      prevHeightRef.current = chartRef.current.clientHeight;
    }

    const currentSignature = JSON.stringify(data);
    const isNewData = currentSignature !== prevDataSignatureRef.current;

    if (isNewData) {
      prevDataSignatureRef.current = currentSignature;
      chartInstance.current.clear();
      chartInstance.current.setOption(options, true);
    } else {
      chartInstance.current.setOption(options, false);
    }
    return undefined;
  }, [options, data]);

  const isAnimationFinishedRef = useRef(false);
  isAnimationFinishedRef.current = isAnimationFinished;

  // Handle container resize without interrupting animations
  useEffect(() => {
    if (!chartRef.current) {
      return undefined;
    }

    let resizeTimer: any = null;

    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (!isAnimationFinishedRef.current) return;
        if (!chartRef.current || !chartInstance.current) return;
        const currentWidth = chartRef.current.clientWidth;
        const currentHeight = chartRef.current.clientHeight;
        if (currentWidth === 0 || currentHeight === 0) return;
        if (currentWidth === prevWidthRef.current && currentHeight === prevHeightRef.current) return;
        prevWidthRef.current = currentWidth;
        prevHeightRef.current = currentHeight;
        chartInstance.current.resize({
          animation: {
            duration: 300,
            easing: 'cubicOut',
          },
        });
      }, 100);
    };

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });

    resizeObserver.observe(chartRef.current);
    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(resizeTimer);
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => () => {
      chartInstance.current?.dispose();
      chartInstance.current = null;
    }, []);

  return (
    <Box
      ref={chartRef}
      className={className}
      sx={sx}
      style={{
        width: '100%',
        height: typeof height === 'number' ? `${height}px` : height,
        minHeight: 280,
      }}
    />
  );
}

// Attach subcomponents to compound component
EChartsBarChart.Grid = Grid;
EChartsBarChart.XAxis = XAxis;
EChartsBarChart.YAxis = YAxis;
EChartsBarChart.Legend = Legend;
EChartsBarChart.Tooltip = Tooltip;
EChartsBarChart.Bar = Bar;
