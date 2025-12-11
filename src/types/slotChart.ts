// Slot Chart Types - For API-driven and Manual chart modes

export type SlotChartType =
  | 'win'
  | 'balance'
  | 'balance_spectrum'
  | 'win_bucket_rtp'
  | 'win_bucket_probability'
  | 'rtp_comparison'
  | 'win_detail';

export type ManualChartType = 'bar' | 'line' | 'pie' | 'doughnut';

export type ChartDataMode = 'api' | 'manual';

// Win bucket labels (13 buckets)
export const WIN_BUCKET_LABELS = [
  '0',
  '0-1x',
  '1-2x',
  '2-5x',
  '5-10x',
  '10-25x',
  '25-50x',
  '50-75x',
  '75-100x',
  '100-250x',
  '<500x',
  '<1000x',
  '<5000x',
  '5k+ x',
] as const;

export interface SlotChartTypeInfo {
  id: SlotChartType;
  label: string;
  description: string;
  chartJsType: 'bar' | 'line';
  stacked?: boolean;
}

export const SLOT_CHART_TYPES: SlotChartTypeInfo[] = [
  {
    id: 'win',
    label: 'Win Multipliers',
    description: 'Win multipliers per spin (stacked by type)',
    chartJsType: 'bar',
    stacked: true,
  },
  {
    id: 'balance',
    label: 'Balance',
    description: 'Running balance over time',
    chartJsType: 'line',
  },
  {
    id: 'balance_spectrum',
    label: 'Balance Spectrum',
    description: 'Session balance progression (500-spin bands)',
    chartJsType: 'line',
  },
  {
    id: 'win_bucket_rtp',
    label: 'Win Bucket RTP',
    description: 'RTP contribution by win size (13 buckets)',
    chartJsType: 'line',
  },
  {
    id: 'win_bucket_probability',
    label: 'Win Bucket Probability',
    description: 'Hit probability per bucket',
    chartJsType: 'line',
  },
  {
    id: 'rtp_comparison',
    label: 'RTP Comparison',
    description: 'Multi-game RTP comparison',
    chartJsType: 'bar',
  },
  {
    id: 'win_detail',
    label: 'Win Detail',
    description: 'Detailed win events breakdown',
    chartJsType: 'bar',
    stacked: true,
  },
];

// Slot Graph API Mode configuration
export interface SlotGraphConfig {
  chartType: SlotChartType;
  gameId: string;
  gameName: string;
  sessionId?: string;
  comparison?: {
    enabled: boolean;
    gameIds: string[];
  };
}

// Manual Mode configuration
export interface ManualChartConfig {
  chartType: ManualChartType;
  data: ManualChartDataPoint[];
}

export interface ManualChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

// Cached chart data
export interface CachedChartData {
  fetchedAt: string;
  chartJsData: ChartJsData;
}

// Chart.js data format
export interface ChartJsData {
  labels: string[];
  datasets: ChartJsDataset[];
}

export interface ChartJsDataset {
  label: string;
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string | string[];
  borderWidth?: number;
  fill?: boolean;
  tension?: number;
  pointRadius?: number;
  hidden?: boolean; // Chart.js dataset visibility control
}

// Combined ChartBlock content structure
export interface ChartBlockContent {
  dataMode: ChartDataMode;
  title?: string;

  // API Mode (Slot Graph)
  slotGraph?: SlotGraphConfig;

  // Manual Mode
  manual?: ManualChartConfig;

  // Cached data for quick render
  cachedData?: CachedChartData;
}

// API Response Types
export interface GameInfo {
  id: string;
  name: string;
  sessions?: SessionInfo[];
}

export interface SessionInfo {
  id: string;
  timestamp: string;
  rounds: number;
}

// Tracker Data Types (from slot_graph reference)
export interface TrackerSessionRecord {
  rounds: number;
  balance: number;
  totalWager: number;
  totalWinAmount: number;
  baseWinAmount: number;
  featureWinAmount: number;
  subWinAmounts: Record<string, number>;
  winCount: number;
  featureTrigger: number;
  subFeatureTriggers: Record<string, number>;
  subFeatureRates: Record<string, string>;
  winBucketCounts: Record<string, number[]>;
  winBucketWins: Record<string, number[]>;
  trackRTPs: number[];
  trackBalances: number[];
  trackWinMultipliers: (number | false)[];
  trackSubWinMultipliers: Record<string, number[]>;
  trackSplitData: number[];
  betAmount: number;
}

// Balance Spin Count (for time-on-device metrics)
export interface BalanceSpinCount {
  targetBalanceUnit: number;
  trackTotalCounter: number;
  trackSumBaseSpinCount: number;
  trackSumAllSpinCount: number;
  averageBaseSpinCount: number;
  averageAllSpinCount: number;
}

// API Request/Response Types
export interface SlotGraphDataRequest {
  gameId: string;
  chartType: SlotChartType;
  sessionId?: string;
}

export interface SlotGraphDataResponse {
  success: boolean;
  data?: ChartJsData;
  error?: string;
  metadata?: {
    gameId: string;
    gameName: string;
    rounds: number;
    chartType: SlotChartType;
    downsampledFrom?: number;
    downsampledTo?: number;
  };
}

export interface SlotGraphCompareRequest {
  gameIds: string[];
  chartType: SlotChartType;
}

export interface SlotGraphCompareResponse {
  success: boolean;
  data?: ChartJsData;
  error?: string;
}

export interface GamesListResponse {
  success: boolean;
  games?: GameInfo[];
  error?: string;
}
