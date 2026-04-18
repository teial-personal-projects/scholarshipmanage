import { Response } from 'express';

/**
 * HTTP Response Helper
 * Provides consistent, type-safe methods for common HTTP responses
 * 
 * Usage:
 *   import { httpResponse } from '../utils/http-response.js';
 *   httpResponse.unauthorized(res);
 *   httpResponse.badRequest(res, 'Invalid input');
 *   httpResponse.created(res, data);
 */
class HttpResponse {
  /**
   * 200 OK - Successful request
   */
  ok(res: Response, data?: unknown): void {
    if (data !== undefined) {
      res.status(200).json(data);
    } else {
      res.status(200).send();
    }
  }

  /**
   * 201 Created - Resource created successfully
   */
  created(res: Response, data: unknown): void {
    res.status(201).json(data);
  }

  /**
   * 204 No Content - Successful request with no response body
   * Commonly used for DELETE operations
   */
  noContent(res: Response): void {
    res.status(204).send();
  }

  /**
   * 400 Bad Request - Invalid request data
   */
  badRequest(res: Response, message?: string, errors?: unknown): void {
    const response: { error: string; message?: string; errors?: unknown } = {
      error: 'Bad Request',
    };

    if (message) {
      response.message = message;
    }

    if (errors) {
      response.errors = errors;
    }

    res.status(400).json(response);
  }

  /**
   * 400 Bad Request - Validation error
   */
  validationError(res: Response, message: string, errors?: unknown): void {
    const response: { error: string; message: string; errors?: unknown } = {
      error: 'Validation Error',
      message,
    };

    if (errors) {
      response.errors = errors;
    }

    res.status(400).json(response);
  }

  /**
   * 401 Unauthorized - Authentication required
   */
  unauthorized(res: Response, message: string = 'Unauthorized'): void {
    res.status(401).json({ error: message });
  }

  /**
   * 403 Forbidden - Insufficient permissions
   */
  forbidden(res: Response, message: string = 'Forbidden'): void {
    res.status(403).json({ error: message });
  }

  /**
   * 404 Not Found - Resource not found
   */
  notFound(res: Response, message: string = 'Not Found'): void {
    res.status(404).json({ error: message });
  }

  /**
   * 410 Gone - Resource no longer available
   */
  gone(res: Response, message: string): void {
    res.status(410).json({
      error: 'Gone',
      message,
    });
  }

  /**
   * 500 Internal Server Error
   */
  serverError(res: Response, message: string = 'Internal Server Error'): void {
    res.status(500).json({ error: message });
  }
}

// Export singleton instance
export const httpResponse = new HttpResponse();

