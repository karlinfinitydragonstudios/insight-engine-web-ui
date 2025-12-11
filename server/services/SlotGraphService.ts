import JSZip from 'jszip';

// Slot Graph Data Types
export type SlotChartType =
  | 'win'
  | 'balance'
  | 'balance_spectrum'
  | 'win_bucket_rtp'
  | 'win_bucket_probability'
  | 'rtp_comparison'
  | 'win_detail';

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

// Raw tracker data structure from the ZIP files
export interface TrackerSessionRecord {
  id?: string;
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
  winBucketRTPs?: Record<string, number[]>;
  winBucketProbabilities?: Record<string, number[]>;
  trackRTPs: number[];
  trackBalances: number[];
  trackWinMultipliers: (number | false)[];
  trackSubWinMultipliers: Record<string, number[]>;
  trackSplitData?: number[];
  betAmount: number;
  winBucketNames?: string[];
}

export interface GameInfo {
  id: string;
  name: string;
  file: string;
  version?: string;
  code?: string;
  hide?: boolean;
}

interface GameListResponse {
  data: Array<{
    name: string;
    file: string;
    version?: string;
    code?: string;
    hide?: boolean;
  }>;
}

// Cache for fetched data
const dataCache = new Map<string, { data: TrackerSessionRecord; fetchedAt: number }>();
const gameListCache: { games: GameInfo[]; fetchedAt: number } | null = null;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour
const GAME_LIST_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

// Base URL for tracker data
const BASE_URL = 'https://infinitydragonstudio.com/datatool/graph/trackerdata';

// Win bucket labels (13 buckets + "5k+ x")
const WIN_BUCKET_LABELS = [
  '0', '0-1x', '1-2x', '2-5x', '5-10x', '10-25x', '25-50x',
  '50-75x', '75-100x', '100-250x', '<500x', '<1000x', '<5000x', '5k+ x'
];

// Default colors matching TrackerRender.js
const CHART_COLORS = {
  win: ['#FF0000', '#008200', '#00E100', '#FF9A00', '#FF6000', '#FF2C00'], // lose, <x2, x2-x5, x5-x10, x10-x20, x20+
  winDetail: ['#00FF00', '#E86500', '#00FFFF', '#0000FF', '#FF0000', '#301934', '#703000', '#DD00FF', '#955F00', '#FFBB00', '#325192', '#6C9530'],
  winBucket: ['#000000', '#002CFF', '#ff0000', '#005600', '#955F00', '#000082', '#DD00FF', '#E86500', '#00C700'],
  balance: 'rgba(59, 130, 246, 0.8)',
};

export class SlotGraphService {
  private gameListCache: { games: GameInfo[]; fetchedAt: number } | null = null;

  /**
   * Fetch available games from data.json
   */
  async getAvailableGames(): Promise<GameInfo[]> {
    // Check cache first
    if (this.gameListCache && Date.now() - this.gameListCache.fetchedAt < GAME_LIST_CACHE_TTL) {
      return this.gameListCache.games;
    }

    try {
      const response = await fetch(`${BASE_URL}/data.json`);
      if (!response.ok) {
        throw new Error(`Failed to fetch game list: ${response.status}`);
      }

      const result = await response.json() as GameListResponse;

      // Filter out hidden games and transform to GameInfo
      // Use file as ID since it's unique (names can be duplicated for different versions)
      const games: GameInfo[] = result.data
        .filter(game => !game.hide)
        .map(game => ({
          id: game.file, // Use file as unique ID (e.g., "GameName_v1.0.zip")
          name: game.name,
          file: game.file,
          version: game.version,
          code: game.code,
        }));

      // Cache the result
      this.gameListCache = { games, fetchedAt: Date.now() };

      return games;
    } catch (error) {
      console.error('Error fetching game list:', error);
      // Return cached data if available, even if stale
      if (this.gameListCache) {
        return this.gameListCache.games;
      }
      throw error;
    }
  }

  /**
   * Fetch and parse tracker data from external ZIP file
   */
  async fetchTrackerData(gameId: string): Promise<TrackerSessionRecord | null> {
    // Check cache first
    const cached = dataCache.get(gameId);
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
      return cached.data;
    }

    try {
      // Get the file name from game list
      // gameId can be the file name (new format) or the game name (legacy/fallback)
      const games = await this.getAvailableGames();

      // Normalize for comparison: lowercase, remove .zip extension
      const normalizeId = (s: string) => s.toLowerCase().replace(/\.zip$/i, '').replace(/[_\s]/g, '');

      const game = games.find(g =>
        g.id === gameId ||
        g.file === gameId ||
        g.name === gameId ||
        // Normalized comparison (handles space/underscore differences, case, .zip extension)
        normalizeId(g.id) === normalizeId(gameId) ||
        normalizeId(g.file) === normalizeId(gameId) ||
        normalizeId(g.name) === normalizeId(gameId)
      );

      if (!game) {
        console.error(`Game not found: "${gameId}"`);
        console.error('Available game IDs:', games.slice(0, 5).map(g => ({ id: g.id, name: g.name, file: g.file })));
        return null;
      }

      const zipUrl = `${BASE_URL}/${game.file}`;
      console.log(`Fetching tracker data from: ${zipUrl}`);

      const response = await fetch(zipUrl);
      if (!response.ok) {
        console.error(`Failed to fetch tracker data: ${response.status}`);
        return null;
      }

      const arrayBuffer = await response.arrayBuffer();
      const zip = await JSZip.loadAsync(arrayBuffer);

      // Get the first file in the zip (following dashboard.html pattern)
      const firstFileName = Object.keys(zip.files)[0];
      if (!firstFileName) {
        console.error('No files found in ZIP');
        return null;
      }

      const jsonContent = await zip.files[firstFileName].async('string');
      const data = JSON.parse(jsonContent) as TrackerSessionRecord;

      // Post-process data following dashboard.html loadData() patterns
      data.id = gameId;

      // Add winBucketNames if missing
      if (!data.winBucketNames) {
        data.winBucketNames = WIN_BUCKET_LABELS;
      }

      // Add rounds if missing
      if (!data.rounds && data.trackWinMultipliers) {
        data.rounds = data.trackWinMultipliers.length;
      }

      // Add totalWager if missing (1 unit per round)
      if (!data.totalWager && data.rounds) {
        data.totalWager = data.rounds;
      }

      // Calculate feature bucket data if missing (feature = all - base)
      this.calculateFeatureData(data);

      // Cache the data
      dataCache.set(gameId, { data, fetchedAt: Date.now() });

      return data;
    } catch (error) {
      console.error('Error fetching tracker data:', error);
      return null;
    }
  }

  /**
   * Calculate feature data (all - base) following dashboard.html pattern
   */
  private calculateFeatureData(data: TrackerSessionRecord): void {
    // winBucketWins.feature
    if (data.winBucketWins?.base && data.winBucketWins?.all && !data.winBucketWins.feature) {
      data.winBucketWins.feature = data.winBucketWins.base.map((val, i) =>
        Math.max(0, (data.winBucketWins.all[i] || 0) - val)
      );
    }

    // winBucketCounts.feature
    if (data.winBucketCounts?.base && data.winBucketCounts?.all && !data.winBucketCounts.feature) {
      data.winBucketCounts.feature = data.winBucketCounts.base.map((val, i) =>
        Math.max(0, (data.winBucketCounts.all[i] || 0) - val)
      );
    }

    // winBucketRTPs.feature
    if (data.winBucketRTPs?.base && data.winBucketRTPs?.all && !data.winBucketRTPs.feature) {
      data.winBucketRTPs.feature = data.winBucketRTPs.base.map((val, i) =>
        Math.max(0, (data.winBucketRTPs.all[i] || 0) - val)
      );
    }

    // winBucketProbabilities.feature
    if (data.winBucketProbabilities?.base && data.winBucketProbabilities?.all && !data.winBucketProbabilities.feature) {
      data.winBucketProbabilities.feature = data.winBucketProbabilities.base.map((val, i) =>
        Math.max(0, (data.winBucketProbabilities.all[i] || 0) - val)
      );
    }
  }

  /**
   * LTTB (Largest Triangle Three Buckets) downsampling algorithm
   * Reduces data points while preserving visual shape
   */
  downsampleLTTB(data: number[], targetPoints: number): number[] {
    if (data.length <= targetPoints) return data;

    const result: number[] = [];
    const bucketSize = (data.length - 2) / (targetPoints - 2);

    // Always keep first point
    result.push(data[0]);

    for (let i = 0; i < targetPoints - 2; i++) {
      const bucketStart = Math.floor((i + 0) * bucketSize) + 1;
      const bucketEnd = Math.floor((i + 1) * bucketSize) + 1;

      // Next bucket for triangle calculation
      const nextBucketStart = Math.floor((i + 1) * bucketSize) + 1;
      const nextBucketEnd = Math.min(Math.floor((i + 2) * bucketSize) + 1, data.length);

      // Average of next bucket (point C)
      let avgX = 0, avgY = 0, count = 0;
      for (let j = nextBucketStart; j < nextBucketEnd; j++) {
        avgX += j;
        avgY += data[j];
        count++;
      }
      if (count > 0) {
        avgX /= count;
        avgY /= count;
      }

      // Point A (previous selected point)
      const pointAX = result.length - 1;
      const pointAY = result[result.length - 1];

      // Find point B with largest triangle area
      let maxArea = -1;
      let maxIdx = bucketStart;

      for (let j = bucketStart; j < bucketEnd && j < data.length; j++) {
        // Triangle area
        const area = Math.abs(
          (pointAX - avgX) * (data[j] - pointAY) -
          (pointAX - j) * (avgY - pointAY)
        ) * 0.5;

        if (area > maxArea) {
          maxArea = area;
          maxIdx = j;
        }
      }

      result.push(data[maxIdx]);
    }

    // Always keep last point
    result.push(data[data.length - 1]);

    return result;
  }

  /**
   * Transform tracker data to Chart.js format based on chart type
   */
  transformToChartData(
    data: TrackerSessionRecord,
    chartType: SlotChartType,
    maxPoints: number = 500, // Match TrackerRender.renderSessionBandRound default
    pageIndex: number = 0
  ): ChartJsData {
    switch (chartType) {
      case 'balance':
        return this.createBalanceChart(data, maxPoints, pageIndex);
      case 'win':
        return this.createWinChart(data, maxPoints, pageIndex);
      case 'balance_spectrum':
        return this.createBalanceSpectrumChart(data);
      case 'win_bucket_rtp':
        return this.createWinBucketRTPChart(data);
      case 'win_bucket_probability':
        return this.createWinBucketProbabilityChart(data);
      case 'rtp_comparison':
        return this.createRTPComparisonChart(data);
      case 'win_detail':
        return this.createWinDetailChart(data, maxPoints, pageIndex);
      default:
        return this.createBalanceChart(data, maxPoints, pageIndex);
    }
  }

  private createBalanceChart(data: TrackerSessionRecord, maxPoints: number, pageIndex: number): ChartJsData {
    const startIndex = pageIndex * maxPoints;
    const endIndex = Math.min(startIndex + maxPoints, data.trackBalances.length);

    const balances = data.trackBalances.slice(startIndex, endIndex);
    const labels = balances.map((_, i) => `${startIndex + i + 1}`);

    return {
      labels,
      datasets: [{
        label: `Balance - ${data.id || 'Game'}`,
        data: balances,
        borderColor: CHART_COLORS.balance,
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.1,
        pointRadius: 0,
        borderWidth: 1,
      }],
    };
  }

  private createWinChart(data: TrackerSessionRecord, maxPoints: number, pageIndex: number): ChartJsData {
    const startIndex = pageIndex * maxPoints;
    const endIndex = Math.min(startIndex + maxPoints, data.trackWinMultipliers.length);

    const labels: string[] = [];
    for (let i = startIndex; i < endIndex; i++) {
      labels.push(`${i + 1}`);
    }

    // Following TrackerRender.js pattern for win chart buckets
    const buckets = ["lose", "< x2", "x2-x5", "x5-x10", "x10-x20", "x20+"];
    const values: number[][] = [[], [], [], [], [], []];

    for (let i = startIndex; i < endIndex; i++) {
      const value = data.trackWinMultipliers[i];

      // Initialize all buckets to 0
      for (let b = 0; b < 6; b++) values[b].push(0);

      if (value === false || value === 0 || (typeof value === 'number' && value <= 0)) {
        values[0][values[0].length - 1] = -1; // lose (shows as red bar below 0)
      } else if (typeof value === 'number') {
        if (value < 2) values[1][values[1].length - 1] = value;
        else if (value < 5) values[2][values[2].length - 1] = value;
        else if (value < 10) values[3][values[3].length - 1] = value;
        else if (value < 20) values[4][values[4].length - 1] = value;
        else values[5][values[5].length - 1] = value;
      }
    }

    const datasets: ChartJsDataset[] = buckets.map((label, i) => ({
      label,
      data: values[i],
      backgroundColor: CHART_COLORS.win[i],
      borderWidth: 0,
    }));

    return { labels, datasets };
  }

  private createWinDetailChart(data: TrackerSessionRecord, maxPoints: number, pageIndex: number): ChartJsData {
    const startIndex = pageIndex * maxPoints;
    const endIndex = Math.min(startIndex + maxPoints, data.trackWinMultipliers.length);

    const labels: string[] = [];
    for (let i = startIndex; i < endIndex; i++) {
      labels.push(`${i + 1}`);
    }

    // Sort subWin keys following TrackerRender.SortSubWinKeys pattern
    let keys = Object.keys(data.trackSubWinMultipliers || {});
    keys = this.sortSubWinKeys(keys);

    const datasets: ChartJsDataset[] = keys.map((key, index) => {
      const values: number[] = [];
      for (let i = startIndex; i < endIndex; i++) {
        values.push(data.trackSubWinMultipliers[key]?.[i] || 0);
      }
      return {
        label: key,
        data: values,
        backgroundColor: CHART_COLORS.winDetail[index % CHART_COLORS.winDetail.length],
        borderWidth: 0,
      };
    });

    // Add lose dataset
    const loseValues: number[] = [];
    for (let i = startIndex; i < endIndex; i++) {
      const value = data.trackWinMultipliers[i];
      loseValues.push(value === false || value === 0 || (typeof value === 'number' && value <= 0) ? -1 : 0);
    }
    datasets.push({
      label: 'lose',
      data: loseValues,
      backgroundColor: 'red',
      borderWidth: 0,
    });

    return { labels, datasets };
  }

  private sortSubWinKeys(keys: string[]): string[] {
    // Following TrackerRender.SortSubWinKeys logic
    keys = [...keys].sort();

    const moveToFront = (arr: string[], item: string) => {
      const idx = arr.indexOf(item);
      if (idx > -1) {
        arr.splice(idx, 1);
        arr.unshift(item);
      }
    };

    moveToFront(keys, 'free');
    moveToFront(keys, 'linkwin');
    moveToFront(keys, 'bonus_win');
    moveToFront(keys, 'bonus');
    moveToFront(keys, 'collect');

    // Move any 'base*' to front
    for (const key of [...keys]) {
      if (key.includes('base')) {
        moveToFront(keys, key);
      }
    }

    moveToFront(keys, 'stepper');
    moveToFront(keys, 'all');
    moveToFront(keys, 'feature');
    moveToFront(keys, 'base');

    return keys;
  }

  private createBalanceSpectrumChart(data: TrackerSessionRecord): ChartJsData {
    // Balance Spectrum shows multiple session bands as line charts
    // Following TrackerRender.RenderBalanceSpectrumChart pattern
    const SESSION_BAND_ROUND = 500;
    const MAX_RENDER_LINES = 200; // Limit to ~200 lines for performance

    // Ensure trackBalances exists and is an array
    if (!data.trackBalances || !Array.isArray(data.trackBalances)) {
      console.warn('trackBalances is missing or not an array');
      return { labels: [], datasets: [] };
    }

    const rawValues = data.trackBalances;
    const maxEntries = Math.min(rawValues.length, 200000);

    // Split data into session bands
    const balanceData: number[][] = [];
    let maxSessionRounds = SESSION_BAND_ROUND;

    for (let i = 0; i < maxEntries; i += maxSessionRounds) {
      const values: number[] = [];
      const initBalance = rawValues[i] || 0;
      for (let j = 0; j < maxSessionRounds && (i + j) < rawValues.length; j++) {
        values.push((rawValues[i + j] || 0) - initBalance);
      }
      if (values.length > 0) {
        balanceData.push(values);
      }
    }

    if (maxSessionRounds < 50) maxSessionRounds = 50;

    const numBands = balanceData.length;
    const datasets: ChartJsDataset[] = [];

    // Limit rendering to MAX_RENDER_LINES (too many lines are hard to see)
    const pickRender = Math.max(1, Math.floor(numBands / MAX_RENDER_LINES));

    for (let i = 0; i < numBands; i++) {
      if (balanceData[i].length === 0) continue;

      // Skip some bands if there are too many
      if (pickRender > 1 && i % pickRender !== 0) continue;

      const endBalanceValue = balanceData[i][balanceData[i].length - 1];

      // Color based on final balance (following original pattern)
      let color: string;
      if (endBalanceValue > 10) {
        color = '#00680088'; // Green - profit > 10x
      } else if (endBalanceValue > 0) {
        color = '#D600FF70'; // Purple - small profit
      } else if (endBalanceValue < -20) {
        color = '#FF000070'; // Red - big loss
      } else if (endBalanceValue < -5) {
        color = '#FF000070'; // Red - medium loss
      } else {
        color = '#FF870070'; // Orange - small loss
      }

      datasets.push({
        label: `Session ${i + 1}`,
        data: balanceData[i],
        borderColor: color,
        borderWidth: 1,
        tension: 0,
        pointRadius: 0,
        fill: false,
      });
    }

    // Generate labels (1 to maxSessionRounds)
    const labels: string[] = [];
    for (let i = 1; i <= maxSessionRounds; i++) {
      labels.push(i.toString());
    }

    return { labels, datasets };
  }

  private createWinBucketRTPChart(data: TrackerSessionRecord): ChartJsData {
    // Dynamically get ALL feature set keys from winBucketWins or winBucketRTPs
    // Following TrackerRender.RenderWinBucketChart pattern
    const allChartIds = new Set<string>(['base', 'all']);

    // Add all keys from winBucketWins
    if (data.winBucketWins) {
      for (const key of Object.keys(data.winBucketWins)) {
        allChartIds.add(key);
      }
    }
    // Add all keys from winBucketRTPs
    if (data.winBucketRTPs) {
      for (const key of Object.keys(data.winBucketRTPs)) {
        allChartIds.add(key);
      }
    }

    const categories = Array.from(allChartIds);
    const datasets: ChartJsDataset[] = [];

    for (let i = 0; i < categories.length; i++) {
      const category = categories[i];
      let rtpData: number[];

      if (data.winBucketRTPs?.[category]) {
        rtpData = [...data.winBucketRTPs[category]];
      } else if (data.winBucketWins?.[category] && data.totalWager) {
        // Calculate RTP contribution per bucket
        rtpData = data.winBucketWins[category].map(win =>
          (win / data.totalWager) * 100
        );
      } else {
        continue;
      }

      // Prepend "0" bucket if we have 13 buckets (need 14 total with "0")
      // Following TrackerRender pattern: bucket 0 = no RTP contribution from non-wins
      if (rtpData.length === 13) {
        rtpData.unshift(0); // No RTP contribution from "no win" bucket
      }

      // Default visibility: only show base, all, feature by default
      // Hide sub-features (anything starting with _ or other custom keys)
      const lowerCategory = category.toLowerCase();
      const isDefaultVisible = lowerCategory === 'base' || lowerCategory === 'all' || lowerCategory === 'feature';

      datasets.push({
        label: `${category} RTP %`,
        data: rtpData,
        borderColor: CHART_COLORS.winBucket[i % CHART_COLORS.winBucket.length],
        backgroundColor: `${CHART_COLORS.winBucket[i % CHART_COLORS.winBucket.length]}33`,
        fill: false,
        tension: 0.3,
        pointRadius: 4,
        borderWidth: 2,
        hidden: !isDefaultVisible,
      });
    }

    return {
      labels: WIN_BUCKET_LABELS,
      datasets,
    };
  }

  private createWinBucketProbabilityChart(data: TrackerSessionRecord): ChartJsData {
    // Dynamically get ALL feature set keys from winBucketCounts or winBucketProbabilities
    // Following TrackerRender.RenderWinBucketChart pattern
    const allChartIds = new Set<string>(['base', 'all']);

    // Add all keys from winBucketCounts
    if (data.winBucketCounts) {
      for (const key of Object.keys(data.winBucketCounts)) {
        allChartIds.add(key);
      }
    }
    // Add all keys from winBucketProbabilities
    if (data.winBucketProbabilities) {
      for (const key of Object.keys(data.winBucketProbabilities)) {
        allChartIds.add(key);
      }
    }

    const categories = Array.from(allChartIds);
    const datasets: ChartJsDataset[] = [];

    for (let i = 0; i < categories.length; i++) {
      const category = categories[i];
      let probData: number[];

      if (data.winBucketProbabilities?.[category]) {
        probData = [...data.winBucketProbabilities[category]];
      } else if (data.winBucketCounts?.[category] && data.rounds) {
        // Calculate probability per bucket
        probData = data.winBucketCounts[category].map(count =>
          (count / data.rounds) * 100
        );
      } else {
        continue;
      }

      // Prepend "0" bucket with no-win probability (100 - sum of other probabilities)
      // Following TrackerRender pattern
      if (probData.length === 13) {
        const sumProbabilities = probData.reduce((a, b) => a + b, 0);
        probData.unshift(100 - sumProbabilities);
      }

      // Default visibility: only show base, all, feature by default
      // Hide sub-features (anything starting with _ or other custom keys)
      const lowerCategory = category.toLowerCase();
      const isDefaultVisible = lowerCategory === 'base' || lowerCategory === 'all' || lowerCategory === 'feature';

      datasets.push({
        label: `${category} Hit Rate %`,
        data: probData,
        borderColor: CHART_COLORS.winBucket[i % CHART_COLORS.winBucket.length],
        backgroundColor: `${CHART_COLORS.winBucket[i % CHART_COLORS.winBucket.length]}33`,
        fill: false,
        tension: 0.3,
        pointRadius: 4,
        borderWidth: 2,
        hidden: !isDefaultVisible,
      });
    }

    return {
      labels: WIN_BUCKET_LABELS,
      datasets,
    };
  }

  private createRTPComparisonChart(data: TrackerSessionRecord): ChartJsData {
    // RTP breakdown by win type
    const labels: string[] = [];
    const rtpValues: number[] = [];

    // Base and Feature RTP
    if (data.totalWager > 0) {
      labels.push('Base Game');
      rtpValues.push((data.baseWinAmount / data.totalWager) * 100);

      labels.push('Feature');
      rtpValues.push((data.featureWinAmount / data.totalWager) * 100);

      // Sub-win RTPs
      for (const [subId, subWin] of Object.entries(data.subWinAmounts || {})) {
        if (subId !== 'base' && subId !== 'feature') {
          labels.push(subId);
          rtpValues.push((subWin / data.totalWager) * 100);
        }
      }
    }

    return {
      labels,
      datasets: [{
        label: 'RTP %',
        data: rtpValues,
        backgroundColor: labels.map((_, i) => CHART_COLORS.winBucket[i % CHART_COLORS.winBucket.length]),
        borderWidth: 0,
      }],
    };
  }

  /**
   * Get chart data for a specific game and chart type
   */
  async getChartData(
    gameId: string,
    chartType: SlotChartType,
    maxPoints: number = 500,
    pageIndex: number = 0
  ): Promise<{ success: boolean; data?: ChartJsData; error?: string; metadata?: Record<string, unknown> }> {
    const trackerData = await this.fetchTrackerData(gameId);

    if (!trackerData) {
      return { success: false, error: `Failed to fetch tracker data for game: ${gameId}` };
    }

    const chartData = this.transformToChartData(trackerData, chartType, maxPoints, pageIndex);
    const totalPages = Math.ceil(trackerData.trackBalances.length / maxPoints);

    return {
      success: true,
      data: chartData,
      metadata: {
        gameId,
        gameName: trackerData.id,
        chartType,
        rounds: trackerData.rounds,
        totalPoints: trackerData.trackBalances.length,
        currentPage: pageIndex,
        totalPages,
        pointsPerPage: maxPoints,
      },
    };
  }

  /**
   * Compare multiple games (for RTP comparison chart)
   */
  async compareGames(
    gameIds: string[],
    chartType: SlotChartType = 'rtp_comparison'
  ): Promise<{ success: boolean; data?: ChartJsData; error?: string }> {
    const results: Array<{ gameId: string; data: TrackerSessionRecord }> = [];

    for (const gameId of gameIds) {
      const trackerData = await this.fetchTrackerData(gameId);
      if (trackerData) {
        results.push({ gameId, data: trackerData });
      }
    }

    if (results.length === 0) {
      return { success: false, error: 'No valid game data found' };
    }

    // Create comparison chart
    const labels = results.map(r => r.gameId);
    const totalRTPs = results.map(r =>
      r.data.totalWager > 0 ? (r.data.totalWinAmount / r.data.totalWager) * 100 : 0
    );

    return {
      success: true,
      data: {
        labels,
        datasets: [{
          label: 'Total RTP %',
          data: totalRTPs,
          backgroundColor: labels.map((_, i) => CHART_COLORS.winBucket[i % CHART_COLORS.winBucket.length]),
          borderWidth: 0,
        }],
      },
    };
  }

  /**
   * Clear cache for a specific game or all games
   */
  clearCache(gameId?: string): void {
    if (gameId) {
      dataCache.delete(gameId);
    } else {
      dataCache.clear();
      this.gameListCache = null;
    }
  }
}

// Export singleton instance
export const slotGraphService = new SlotGraphService();
