import React, { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartData,
  ChartOptions,
} from 'chart.js';
import { Bar, Line, Pie, Doughnut } from 'react-chartjs-2';
import type { ChartJsData, ManualChartType, SlotChartType } from '../../types/slotChart';
import { SLOT_CHART_TYPES } from '../../types/slotChart';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface ChartRendererProps {
  data: ChartJsData;
  chartType: ManualChartType | SlotChartType;
  title?: string;
  height?: number;
  className?: string;
  // For win bucket charts - custom dataset visibility
  // null = use server defaults, Set<label> = only show these datasets
  visibleDatasets?: Set<string> | null;
}

// Default color palette
const DEFAULT_COLORS = [
  'rgba(59, 130, 246, 0.8)',   // blue
  'rgba(16, 185, 129, 0.8)',   // green
  'rgba(245, 158, 11, 0.8)',   // amber
  'rgba(239, 68, 68, 0.8)',    // red
  'rgba(139, 92, 246, 0.8)',   // purple
  'rgba(236, 72, 153, 0.8)',   // pink
  'rgba(6, 182, 212, 0.8)',    // cyan
  'rgba(249, 115, 22, 0.8)',   // orange
];

const DEFAULT_BORDER_COLORS = [
  'rgba(59, 130, 246, 1)',
  'rgba(16, 185, 129, 1)',
  'rgba(245, 158, 11, 1)',
  'rgba(239, 68, 68, 1)',
  'rgba(139, 92, 246, 1)',
  'rgba(236, 72, 153, 1)',
  'rgba(6, 182, 212, 1)',
  'rgba(249, 115, 22, 1)',
];

export const ChartRenderer: React.FC<ChartRendererProps> = ({
  data,
  chartType,
  title,
  height = 300,
  className = '',
  visibleDatasets = null,
}) => {
  // Determine if this is a slot chart type
  const slotChartInfo = SLOT_CHART_TYPES.find((t) => t.id === chartType);
  const isSlotChart = !!slotChartInfo;

  // Check if this is a win bucket chart (has hidden datasets by default)
  const isWinBucketChart = chartType === 'win_bucket_rtp' || chartType === 'win_bucket_probability';

  // Determine the actual Chart.js chart type to use
  const actualChartType = useMemo(() => {
    if (isSlotChart) {
      return slotChartInfo.chartJsType;
    }
    return chartType as ManualChartType;
  }, [chartType, isSlotChart, slotChartInfo]);

  // Process data with default colors if not provided
  const processedData = useMemo<ChartData<'bar' | 'line' | 'pie' | 'doughnut'>>(() => {
    const datasets = data.datasets.map((dataset, index) => {
      const colorIndex = index % DEFAULT_COLORS.length;

      // For pie/doughnut, we need an array of colors
      if (actualChartType === 'pie' || actualChartType === 'doughnut') {
        return {
          ...dataset,
          backgroundColor: dataset.backgroundColor || data.labels.map((_, i) => DEFAULT_COLORS[i % DEFAULT_COLORS.length]),
          borderColor: dataset.borderColor || data.labels.map((_, i) => DEFAULT_BORDER_COLORS[i % DEFAULT_BORDER_COLORS.length]),
          borderWidth: dataset.borderWidth ?? 1,
        };
      }

      // For win bucket charts, control visibility based on visibleDatasets
      let hidden = dataset.hidden;
      if (isWinBucketChart) {
        if (visibleDatasets !== null) {
          // Custom visibility - show only datasets in the set
          hidden = !visibleDatasets.has(dataset.label);
        }
        // If visibleDatasets is null, use server-side hidden flag (default)
      }

      return {
        ...dataset,
        backgroundColor: dataset.backgroundColor || DEFAULT_COLORS[colorIndex],
        borderColor: dataset.borderColor || DEFAULT_BORDER_COLORS[colorIndex],
        borderWidth: dataset.borderWidth ?? 2,
        tension: dataset.tension ?? 0.1,
        pointRadius: dataset.pointRadius ?? (data.labels.length > 100 ? 0 : 3),
        fill: dataset.fill ?? false,
        hidden,
      };
    });

    return {
      labels: data.labels,
      datasets,
    };
  }, [data, actualChartType, isWinBucketChart, visibleDatasets]);

  // Build options based on chart type
  const options = useMemo<ChartOptions<'bar' | 'line' | 'pie' | 'doughnut'>>(() => {
    // Balance spectrum has many datasets (session bands) - hide legend and tooltips
    const isBalanceSpectrum = chartType === 'balance_spectrum';
    // Win bucket charts use custom legend UI, hide Chart.js legend
    const hideNativeLegend = isBalanceSpectrum || isWinBucketChart;

    const baseOptions: ChartOptions<'bar' | 'line' | 'pie' | 'doughnut'> = {
      responsive: true,
      maintainAspectRatio: false,
      animation: isBalanceSpectrum ? false : undefined, // Disable animation for balance spectrum (performance)
      plugins: {
        legend: {
          // Hide legend for balance_spectrum (too many datasets) and win bucket charts (custom UI)
          display: !hideNativeLegend && (data.datasets.length > 1 || actualChartType === 'pie' || actualChartType === 'doughnut'),
          position: 'top' as const,
          labels: {
            color: 'rgb(156, 163, 175)', // text-muted-foreground equivalent
            usePointStyle: true,
          },
        },
        title: {
          display: !!title,
          text: title || '',
          color: 'rgb(229, 231, 235)', // text-foreground equivalent
          font: {
            size: 14,
            weight: 'bold',
          },
        },
        tooltip: {
          enabled: !isBalanceSpectrum, // Disable tooltips for balance spectrum (too many datasets)
          mode: 'index' as const,
          intersect: false,
        },
      },
    };

    // Add scales for bar and line charts
    if (actualChartType === 'bar' || actualChartType === 'line') {
      const isStacked = isSlotChart && slotChartInfo?.stacked;

      (baseOptions as ChartOptions<'bar' | 'line'>).scales = {
        x: {
          grid: {
            color: 'rgba(75, 85, 99, 0.3)',
          },
          ticks: {
            color: 'rgb(156, 163, 175)',
            maxTicksLimit: 20,
          },
          stacked: isStacked,
        },
        y: {
          grid: {
            color: 'rgba(75, 85, 99, 0.3)',
          },
          ticks: {
            color: 'rgb(156, 163, 175)',
          },
          stacked: isStacked,
          beginAtZero: chartType !== 'balance', // Balance chart can go negative
        },
      };
    }

    return baseOptions;
  }, [title, actualChartType, isSlotChart, slotChartInfo, chartType, data.datasets.length, isWinBucketChart]);

  // Render the appropriate chart type
  const renderChart = () => {
    switch (actualChartType) {
      case 'bar':
        return <Bar data={processedData as ChartData<'bar'>} options={options as ChartOptions<'bar'>} />;
      case 'line':
        return <Line data={processedData as ChartData<'line'>} options={options as ChartOptions<'line'>} />;
      case 'pie':
        return <Pie data={processedData as ChartData<'pie'>} options={options as ChartOptions<'pie'>} />;
      case 'doughnut':
        return <Doughnut data={processedData as ChartData<'doughnut'>} options={options as ChartOptions<'doughnut'>} />;
      default:
        return <Bar data={processedData as ChartData<'bar'>} options={options as ChartOptions<'bar'>} />;
    }
  };

  return (
    <div className={`w-full ${className}`} style={{ height }}>
      {renderChart()}
    </div>
  );
};

export default ChartRenderer;
