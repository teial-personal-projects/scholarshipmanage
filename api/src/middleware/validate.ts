import { Request, Response, NextFunction } from 'express';
import { AnyZodObject } from 'zod';

/**
 * Validation middleware using Zod schemas
 * Validates request body, query params, and route params
 *
 * Usage:
 *   router.post('/path', validate(mySchema), controller)
 */
export const validate = (schema: AnyZodObject) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    // Use safeParseAsync for controlled error handling
    const result = await schema.safeParseAsync({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    if (!result.success) {
      // Format Zod errors into user-friendly messages
      const errors = result.error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }));

      res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid request data',
        errors,
      });
      return;
    }

    // Attach validated data to request for use in controllers
    req.body = result.data.body || req.body;
    req.query = result.data.query || req.query;
    req.params = result.data.params || req.params;

    next();
  };
};

/**
 * Validate only request body
 */
export const validateBody = (schema: AnyZodObject) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    // Use safeParseAsync for controlled error handling
    const result = await schema.safeParseAsync(req.body);

    if (!result.success) {
      const errors = result.error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }));

      res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid request body',
        errors,
      });
      return;
    }

    // Attach validated data to request
    req.body = result.data;

    next();
  };
};

/**
 * Validate only query parameters
 */
export const validateQuery = (schema: AnyZodObject) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    // Use safeParseAsync for controlled error handling
    const result = await schema.safeParseAsync(req.query);

    if (!result.success) {
      const errors = result.error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }));

      res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid query parameters',
        errors,
      });
      return;
    }

    // Attach validated data to request
    req.query = result.data as typeof req.query;

    next();
  };
};

/**
 * Validate only route parameters
 */
export const validateParams = (schema: AnyZodObject) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    // Use safeParseAsync for controlled error handling
    const result = await schema.safeParseAsync(req.params);

    if (!result.success) {
      const errors = result.error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }));

      res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid route parameters',
        errors,
      });
      return;
    }

    // Attach validated data to request
    req.params = result.data as typeof req.params;

    next();
  };
};
