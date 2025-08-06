/**
 * Relationship Types API Module
 * 
 * Manages relationship type definitions for guest relationships.
 * Part of the 
 */

import express, { Router } from 'express';
import { ModuleService } from '../core/module-service';
import { ValidationMiddleware } from '../core/validation';
import { isAuthenticated } from '../../middleware';
import { storage } from '../../storage';
import { insertRelationshipTypeSchema } from '@shared/schema';
import { z } from 'zod';

export async function createRelationshipTypesAPI(): Promise<Router> {
  const router = express.Router();
  const service = new ModuleService('relationship-types');
  const validator = new ValidationMiddleware('relationship-types');

  router.use(service.middleware);
  router.use(isAuthenticated); // All relationship type endpoints require authentication

  // Get all relationship types
  router.get('/', async (req, res) => {
    try {
      const relationshipTypes = await storage.getAllRelationshipTypes();
      res.json(relationshipTypes);
    } catch (error) {
      service.handleError(error, res, 'Failed to fetch relationship types');
    }
  });

  // Get relationship type by ID
  router.get('/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid relationship type ID' });
      }

      const relationshipType = await storage.getRelationshipType(id);
      if (!relationshipType) {
        return res.status(404).json({ message: 'Relationship type not found' });
      }

      res.json(relationshipType);
    } catch (error) {
      service.handleError(error, res, 'Failed to fetch relationship type');
    }
  });

  // Create new relationship type
  router.post('/', validator.validate(insertRelationshipTypeSchema), async (req, res) => {
    try {
      const relationshipTypeData = req.validatedBody;
      const relationshipType = await storage.createRelationshipType(relationshipTypeData);
      res.status(201).json(relationshipType);
    } catch (error) {
      service.handleError(error, res, 'Failed to create relationship type');
    }
  });

  // Update relationship type
  router.put('/:id', validator.validate(insertRelationshipTypeSchema.partial()), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid relationship type ID' });
      }

      const relationshipTypeData = req.validatedBody;
      const relationshipType = await storage.updateRelationshipType(id, relationshipTypeData);
      
      if (!relationshipType) {
        return res.status(404).json({ message: 'Relationship type not found' });
      }

      res.json(relationshipType);
    } catch (error) {
      service.handleError(error, res, 'Failed to update relationship type');
    }
  });

  // Delete relationship type
  router.delete('/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid relationship type ID' });
      }

      // Check if relationship type is in use
      const isInUse = await storage.isRelationshipTypeInUse(id);
      if (isInUse) {
        return res.status(400).json({ 
          message: 'Cannot delete relationship type as it is currently in use by guests',
          code: 'RELATIONSHIP_TYPE_IN_USE'
        });
      }

      const success = await storage.deleteRelationshipType(id);
      if (!success) {
        return res.status(404).json({ message: 'Relationship type not found' });
      }

      res.json({ message: 'Relationship type deleted successfully' });
    } catch (error) {
      service.handleError(error, res, 'Failed to delete relationship type');
    }
  });

  // Get relationship type usage statistics
  router.get('/:id/usage', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid relationship type ID' });
      }

      const usage = await storage.getRelationshipTypeUsage(id);
      res.json({
        relationshipTypeId: id,
        guestCount: usage.guestCount,
        eventCount: usage.eventCount,
        isInUse: usage.guestCount > 0
      });
    } catch (error) {
      service.handleError(error, res, 'Failed to get relationship type usage');
    }
  });

  return router;
}