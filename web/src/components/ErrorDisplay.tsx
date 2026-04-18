import React from 'react';
import { type ApiError, ApiErrorType, formatRetryAfter } from '../utils/error-handling';

interface ErrorDisplayProps {
  error: ApiError | Error | string | null | undefined;
  title?: string;
  showFieldErrors?: boolean;
  closable?: boolean;
  onClose?: () => void;
  renderMessage?: (error: ApiError) => React.ReactNode;
}

function getAlertClasses(error: ApiError): string {
  switch (error.type) {
    case ApiErrorType.VALIDATION_ERROR:
    case ApiErrorType.BAD_REQUEST:
    case ApiErrorType.UNAUTHORIZED:
    case ApiErrorType.FORBIDDEN:
    case ApiErrorType.NOT_FOUND:
      return 'bg-yellow-50 border-yellow-200 text-yellow-800';
    case ApiErrorType.RATE_LIMIT_EXCEEDED:
      return 'bg-blue-50 border-blue-200 text-blue-800';
    default:
      return 'bg-red-50 border-red-200 text-red-800';
  }
}

function getDefaultTitle(error: ApiError): string {
  switch (error.type) {
    case ApiErrorType.VALIDATION_ERROR: return 'Validation Error';
    case ApiErrorType.BAD_REQUEST: return 'Invalid Request';
    case ApiErrorType.UNAUTHORIZED: return 'Unauthorized';
    case ApiErrorType.FORBIDDEN: return 'Access Denied';
    case ApiErrorType.NOT_FOUND: return 'Not Found';
    case ApiErrorType.CONFLICT: return 'Conflict';
    case ApiErrorType.RATE_LIMIT_EXCEEDED: return 'Rate Limit Exceeded';
    case ApiErrorType.INTERNAL_SERVER_ERROR: return 'Server Error';
    case ApiErrorType.SERVICE_UNAVAILABLE: return 'Service Unavailable';
    case ApiErrorType.NETWORK_ERROR: return 'Network Error';
    case ApiErrorType.TIMEOUT_ERROR: return 'Request Timeout';
    default: return 'Error';
  }
}

function parseError(error: ApiError | Error | string | null | undefined): ApiError | null {
  if (!error) return null;
  if (typeof error === 'object' && 'type' in error && 'message' in error) return error as ApiError;
  if (error instanceof Error) return { type: ApiErrorType.UNKNOWN_ERROR, message: error.message, originalError: error };
  if (typeof error === 'string') return { type: ApiErrorType.UNKNOWN_ERROR, message: error };
  return null;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  title,
  showFieldErrors = true,
  closable = false,
  onClose,
  renderMessage,
}) => {
  const apiError = parseError(error);
  if (!apiError) return null;

  const alertClasses = getAlertClasses(apiError);
  const alertTitle = title || getDefaultTitle(apiError);

  return (
    <div className={`border rounded-lg p-4 ${alertClasses}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <p className="font-bold mb-1">{alertTitle}</p>
          {renderMessage ? renderMessage(apiError) : (
            <>
              <p className="text-sm">{apiError.message}</p>
              {apiError.rateLimitInfo && (
                <div className="mt-2 text-sm">
                  {apiError.rateLimitInfo.retryAfter && (
                    <p>Please try again in {formatRetryAfter(apiError.rateLimitInfo.retryAfter)}</p>
                  )}
                  {apiError.rateLimitInfo.limit && (
                    <p>Limit: {apiError.rateLimitInfo.remaining || 0}/{apiError.rateLimitInfo.limit} requests</p>
                  )}
                </div>
              )}
              {showFieldErrors && apiError.fieldErrors && Object.keys(apiError.fieldErrors).length > 0 && (
                <div className="mt-2">
                  <p className="text-sm font-semibold mb-1">Please fix the following errors:</p>
                  <ul className="list-disc pl-5">
                    {Object.entries(apiError.fieldErrors).map(([field, errors]) => (
                      <li key={field} className="text-sm">
                        <span className="font-medium">{field}:</span> {errors.join(', ')}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
        {closable && onClose && (
          <button className="text-current opacity-60 hover:opacity-100 flex-shrink-0" onClick={onClose}>✕</button>
        )}
      </div>
    </div>
  );
};

interface InlineErrorProps {
  error?: string | string[];
  className?: string;
}

export const InlineError: React.FC<InlineErrorProps> = ({ error, className }) => {
  if (!error) return null;
  const errors = Array.isArray(error) ? error : [error];
  return (
    <div className={`text-red-500 text-sm mt-1 ${className || ''}`}>
      {errors.map((err, i) => <p key={i}>{err}</p>)}
    </div>
  );
};

interface RateLimitNoticeProps {
  error: ApiError;
  onDismiss?: () => void;
}

export const RateLimitNotice: React.FC<RateLimitNoticeProps> = ({ error, onDismiss }) => {
  if (!error.rateLimitInfo) return null;
  const retryTime = formatRetryAfter(error.rateLimitInfo.retryAfter);
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-blue-800">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-bold mb-1">Too Many Requests</p>
          <p className="text-sm">You've exceeded the rate limit. {retryTime && `Please wait ${retryTime} before trying again.`}</p>
          {error.rateLimitInfo.limit && (
            <p className="text-sm text-blue-600 mt-1">Rate limit: {error.rateLimitInfo.limit} requests per window</p>
          )}
        </div>
        {onDismiss && (
          <button className="text-blue-600 opacity-60 hover:opacity-100 flex-shrink-0" onClick={onDismiss}>✕</button>
        )}
      </div>
    </div>
  );
};
