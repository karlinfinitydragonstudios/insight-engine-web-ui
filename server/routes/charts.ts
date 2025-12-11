import { Router, Request, Response } from 'express';
import { slotGraphService, SlotChartType } from '../services/SlotGraphService';

export const chartsRouter = Router();

/**
 * GET /api/charts/slot-graph/games
 * List available games for slot graph visualization
 */
chartsRouter.get('/slot-graph/games', async (req: Request, res: Response) => {
  try {
    console.log('Fetching available games from slot graph API...');
    const games = await slotGraphService.getAvailableGames();
    console.log(`Found ${games.length} games`);
    res.json({ success: true, games });
  } catch (error) {
    console.error('Error fetching games:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch available games'
    });
  }
});

/**
 * GET /api/charts/slot-graph/data/:gameId/:chartType
 * Get chart data for a specific game and chart type
 * Query params:
 *   - maxPoints: number of points per page (default 500)
 *   - page: page index for pagination (default 0)
 */
chartsRouter.get('/slot-graph/data/:gameId/:chartType', async (req: Request, res: Response) => {
  try {
    const { gameId, chartType } = req.params;
    const maxPoints = parseInt(req.query.maxPoints as string) || 500;
    const pageIndex = parseInt(req.query.page as string) || 0;

    console.log(`Fetching chart data: game=${gameId}, type=${chartType}, maxPoints=${maxPoints}, page=${pageIndex}`);

    // Validate chart type
    const validChartTypes: SlotChartType[] = [
      'win', 'balance', 'balance_spectrum', 'win_bucket_rtp',
      'win_bucket_probability', 'rtp_comparison', 'win_detail'
    ];

    if (!validChartTypes.includes(chartType as SlotChartType)) {
      return res.status(400).json({
        success: false,
        error: `Invalid chart type. Valid types: ${validChartTypes.join(', ')}`
      });
    }

    const result = await slotGraphService.getChartData(
      decodeURIComponent(gameId),
      chartType as SlotChartType,
      maxPoints,
      pageIndex
    );

    console.log(`Chart data result: success=${result.success}, points=${result.data?.labels?.length || 0}`);
    res.json(result);
  } catch (error) {
    console.error('Error fetching chart data:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch chart data'
    });
  }
});

/**
 * POST /api/charts/slot-graph/compare
 * Compare multiple games
 * Body: { gameIds: string[], chartType?: SlotChartType }
 */
chartsRouter.post('/slot-graph/compare', async (req: Request, res: Response) => {
  try {
    const { gameIds, chartType = 'rtp_comparison' } = req.body;

    if (!Array.isArray(gameIds) || gameIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'gameIds must be a non-empty array'
      });
    }

    const result = await slotGraphService.compareGames(gameIds, chartType as SlotChartType);
    res.json(result);
  } catch (error) {
    console.error('Error comparing games:', error);
    res.status(500).json({ success: false, error: 'Failed to compare games' });
  }
});

/**
 * POST /api/charts/slot-graph/clear-cache
 * Clear cached data
 * Body: { gameId?: string } - if not provided, clears all cache
 */
chartsRouter.post('/slot-graph/clear-cache', async (req: Request, res: Response) => {
  try {
    const { gameId } = req.body;
    slotGraphService.clearCache(gameId);
    res.json({ success: true, message: gameId ? `Cache cleared for ${gameId}` : 'All cache cleared' });
  } catch (error) {
    console.error('Error clearing cache:', error);
    res.status(500).json({ success: false, error: 'Failed to clear cache' });
  }
});
