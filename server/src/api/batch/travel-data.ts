import { Request, Response } from 'express';
import { ResponseBuilder } from '../../utils/ResponseBuilder';
import { travelBatchService } from '../../services/TravelBatchService';

export async function getTravelBatchData(req: Request, res: Response) {
  try {
    const eventId = req.params.eventId ? parseInt(req.params.eventId) : req.session.currentEvent?.id;
    
    if (!eventId) {
      return ResponseBuilder.badRequest(res, 'No event selected');
    }

    const data = await travelBatchService.getTravelBatchData(eventId);

    // Set performance headers for monitoring
    res.set({
      'X-Query-Time': data.performance.executionTime.toString(),
      'X-Query-Optimization': data.performance.queryOptimization
    });

    return ResponseBuilder.success(res, {
      ...data,
      message: 'Travel batch data retrieved successfully'
    });
  } catch (error) {
    return ResponseBuilder.internalError(res, 'Failed to fetch travel batch data', error);
  }
}

export async function getTravelStatistics(req: Request, res: Response) {
  try {
    const eventId = req.params.eventId ? parseInt(req.params.eventId) : req.session.currentEvent?.id;
    
    if (!eventId) {
      return ResponseBuilder.badRequest(res, 'No event selected');
    }

    const data = await travelBatchService.getTravelStatistics(eventId);

    // Set performance headers
    res.set({
      'X-Query-Time': data.performance.executionTime.toString(),
      'X-Query-Optimization': data.performance.queryOptimization
    });

    return ResponseBuilder.success(res, {
      ...data,
      message: 'Travel statistics retrieved successfully'
    });
  } catch (error) {
    return ResponseBuilder.internalError(res, 'Failed to fetch travel statistics', error);
  }
}

export async function getOptimizedGuestTravelInfo(req: Request, res: Response) {
  try {
    const eventId = req.params.eventId ? parseInt(req.params.eventId) : req.session.currentEvent?.id;
    const { guestIds } = req.query;
    
    if (!eventId) {
      return ResponseBuilder.badRequest(res, 'No event selected');
    }

    // Parse guestIds if provided
    let parsedGuestIds: number[] | undefined;
    if (guestIds) {
      try {
        parsedGuestIds = Array.isArray(guestIds) 
          ? guestIds.map(id => parseInt(id as string))
          : [parseInt(guestIds as string)];
      } catch (parseError) {
        return ResponseBuilder.badRequest(res, 'Invalid guest IDs format');
      }
    }

    const data = await travelBatchService.getOptimizedGuestTravelInfo(eventId, parsedGuestIds);

    // Set performance headers
    res.set({
      'X-Query-Time': data.performance.executionTime.toString(),
      'X-Query-Optimization': data.performance.queryOptimization
    });

    return ResponseBuilder.success(res, {
      ...data,
      count: data.guests.length,
      message: 'Optimized guest travel info retrieved successfully'
    });
  } catch (error) {
    return ResponseBuilder.internalError(res, 'Failed to fetch optimized guest travel info', error);
  }
}

export async function getPerformanceHealthCheck(req: Request, res: Response) {
  try {
    const eventId = req.params.eventId ? parseInt(req.params.eventId) : req.session.currentEvent?.id;
    
    if (!eventId) {
      return ResponseBuilder.badRequest(res, 'No event selected');
    }

    const healthCheck = await travelBatchService.performanceHealthCheck(eventId);

    // Set health status header
    res.set({
      'X-Health-Status': healthCheck.healthy ? 'healthy' : 'unhealthy'
    });

    return ResponseBuilder.success(res, {
      ...healthCheck,
      message: `Performance health check ${healthCheck.healthy ? 'passed' : 'failed'}`
    });
  } catch (error) {
    return ResponseBuilder.internalError(res, 'Failed to perform health check', error);
  }
}