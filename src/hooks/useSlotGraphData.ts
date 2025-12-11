import { useState, useEffect, useCallback } from 'react';
import type {
  ChartJsData,
  SlotChartType,
  GameInfo,
  GamesListResponse,
  SlotGraphDataResponse,
} from '../types/slotChart';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

interface ChartMetadata {
  gameId: string;
  gameName: string;
  chartType: SlotChartType;
  rounds: number;
  totalPoints: number;
  currentPage: number;
  totalPages: number;
  pointsPerPage: number;
}

interface UseSlotGraphDataResult {
  // Data
  chartData: ChartJsData | null;
  games: GameInfo[];

  // Loading states
  isLoadingGames: boolean;
  isLoadingChart: boolean;

  // Error states
  gamesError: string | null;
  chartError: string | null;

  // Metadata with pagination info
  metadata: ChartMetadata | null;

  // Actions
  fetchGames: () => Promise<void>;
  fetchChartData: (gameId: string, chartType: SlotChartType, maxPoints?: number, page?: number) => Promise<void>;
  clearCache: (gameId?: string) => Promise<void>;
}

// Client-side cache
const chartCache = new Map<string, { data: ChartJsData; metadata: ChartMetadata; fetchedAt: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes client-side cache

export function useSlotGraphData(): UseSlotGraphDataResult {
  const [chartData, setChartData] = useState<ChartJsData | null>(null);
  const [games, setGames] = useState<GameInfo[]>([]);
  const [isLoadingGames, setIsLoadingGames] = useState(false);
  const [isLoadingChart, setIsLoadingChart] = useState(false);
  const [gamesError, setGamesError] = useState<string | null>(null);
  const [chartError, setChartError] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<ChartMetadata | null>(null);

  const fetchGames = useCallback(async () => {
    setIsLoadingGames(true);
    setGamesError(null);

    try {
      const response = await fetch(`${API_BASE}/api/charts/slot-graph/games`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result: GamesListResponse = await response.json();

      if (result.success && result.games) {
        setGames(result.games);
        setGamesError(null);
      } else {
        setGamesError(result.error || 'Failed to fetch games');
      }
    } catch (error) {
      console.error('Error fetching games:', error);
      setGamesError(error instanceof Error ? error.message : 'Network error while fetching games');
    } finally {
      setIsLoadingGames(false);
    }
  }, []);

  const fetchChartData = useCallback(async (
    gameId: string,
    chartType: SlotChartType,
    maxPoints: number = 500,
    page: number = 0
  ) => {
    const cacheKey = `${gameId}-${chartType}-${maxPoints}-${page}`;

    // Check client-side cache
    const cached = chartCache.get(cacheKey);
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
      setChartData(cached.data);
      setMetadata(cached.metadata);
      return;
    }

    setIsLoadingChart(true);
    setChartError(null);

    try {
      // URL-encode the gameId since it can contain special characters like ™ and spaces
      const encodedGameId = encodeURIComponent(gameId);
      const url = `${API_BASE}/api/charts/slot-graph/data/${encodedGameId}/${chartType}?maxPoints=${maxPoints}&page=${page}`;

      console.log('Fetching chart data from:', url);

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result: SlotGraphDataResponse = await response.json();

      if (result.success && result.data) {
        setChartData(result.data);
        const meta = result.metadata as ChartMetadata | undefined;
        setMetadata(meta || null);
        setChartError(null);

        // Cache the result
        if (meta) {
          chartCache.set(cacheKey, {
            data: result.data,
            metadata: meta,
            fetchedAt: Date.now(),
          });
        }
      } else {
        setChartError(result.error || 'Failed to fetch chart data');
        setChartData(null);
      }
    } catch (error) {
      console.error('Error fetching chart data:', error);
      setChartError(error instanceof Error ? error.message : 'Network error while fetching chart data');
      setChartData(null);
    } finally {
      setIsLoadingChart(false);
    }
  }, []);

  const clearCache = useCallback(async (gameId?: string) => {
    try {
      await fetch(`${API_BASE}/api/charts/slot-graph/clear-cache`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId }),
      });

      // Clear client-side cache
      if (gameId) {
        for (const key of chartCache.keys()) {
          if (key.startsWith(gameId)) {
            chartCache.delete(key);
          }
        }
      } else {
        chartCache.clear();
      }
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }, []);

  // Fetch games on mount
  useEffect(() => {
    fetchGames();
  }, [fetchGames]);

  return {
    chartData,
    games,
    isLoadingGames,
    isLoadingChart,
    gamesError,
    chartError,
    metadata,
    fetchGames,
    fetchChartData,
    clearCache,
  };
}

export default useSlotGraphData;
