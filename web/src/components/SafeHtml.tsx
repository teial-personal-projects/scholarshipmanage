import React from 'react';
import { sanitizeHtml, SanitizeOptions } from '../utils/sanitize-html';

interface SafeHtmlProps {
  content: string | null | undefined;
  sanitizeOptions?: SanitizeOptions;
  profile?: SanitizeOptions['profile'];
  maxLength?: number;
  fallback?: React.ReactNode;
  showSanitizationWarning?: boolean;
  warningComponent?: React.ReactNode;
  className?: string;
}

export const SafeHtml: React.FC<SafeHtmlProps> = ({
  content,
  sanitizeOptions,
  profile = 'BASIC',
  maxLength,
  fallback = null,
  showSanitizationWarning = false,
  warningComponent,
  className,
}) => {
  const options: SanitizeOptions = { profile, maxLength, ...sanitizeOptions };
  const sanitized = sanitizeHtml(content, options);
  const wasModified = showSanitizationWarning && content && content.trim() !== sanitized?.trim();

  if (!sanitized) return <>{fallback}</>;

  return (
    <>
      {wasModified && (
        warningComponent || (
          <div className="bg-yellow-50 text-yellow-800 p-2 mb-2 rounded text-sm border-l-4 border-yellow-400">
            ⚠️ Some content was removed for security reasons
          </div>
        )
      )}
      <div className={className} dangerouslySetInnerHTML={{ __html: sanitized }} />
    </>
  );
};

export const SafeNote: React.FC<SafeHtmlProps> = (props) => <SafeHtml {...props} profile="STRICT" />;
export const SafeEssay: React.FC<SafeHtmlProps> = (props) => <SafeHtml {...props} profile="BASIC" />;
export const SafeDocumentation: React.FC<SafeHtmlProps> = (props) => <SafeHtml {...props} profile="EXTENDED" />;
