import { AlertTriangle, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ValidationIssue {
  type: string;
  message: string;
  expected?: string | number;
  actual?: string | number;
}

interface ValidationBadgeProps {
  errors?: ValidationIssue[];
  warnings?: ValidationIssue[];
  showDetails?: boolean;
  className?: string;
}

export function ValidationBadge({
  errors = [],
  warnings = [],
  showDetails = false,
  className,
}: ValidationBadgeProps) {
  const hasErrors = errors.length > 0;
  const hasWarnings = warnings.length > 0;
  const isValid = !hasErrors && !hasWarnings;

  if (isValid && !showDetails) {
    return null;
  }

  // Compact badge view
  if (!showDetails) {
    if (hasErrors) {
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-red-500/20 text-red-500',
            className
          )}
          title={`${errors.length} error(s)`}
        >
          <AlertCircle className="w-3 h-3" />
          {errors.length}
        </span>
      );
    }

    if (hasWarnings) {
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-amber-500/20 text-amber-500',
            className
          )}
          title={`${warnings.length} warning(s)`}
        >
          <AlertTriangle className="w-3 h-3" />
          {warnings.length}
        </span>
      );
    }

    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-green-500/20 text-green-500',
          className
        )}
        title="Valid"
      >
        <CheckCircle className="w-3 h-3" />
      </span>
    );
  }

  // Detailed view with all issues listed
  return (
    <div className={cn('space-y-2', className)}>
      {/* Summary */}
      <div className="flex items-center gap-2 text-sm">
        {hasErrors && (
          <span className="flex items-center gap-1 text-red-500">
            <AlertCircle className="w-4 h-4" />
            {errors.length} error{errors.length !== 1 ? 's' : ''}
          </span>
        )}
        {hasWarnings && (
          <span className="flex items-center gap-1 text-amber-500">
            <AlertTriangle className="w-4 h-4" />
            {warnings.length} warning{warnings.length !== 1 ? 's' : ''}
          </span>
        )}
        {isValid && (
          <span className="flex items-center gap-1 text-green-500">
            <CheckCircle className="w-4 h-4" />
            Valid
          </span>
        )}
      </div>

      {/* Error list */}
      {hasErrors && (
        <div className="space-y-1">
          {errors.map((error, i) => (
            <ValidationIssueItem key={`error-${i}`} issue={error} severity="error" />
          ))}
        </div>
      )}

      {/* Warning list */}
      {hasWarnings && (
        <div className="space-y-1">
          {warnings.map((warning, i) => (
            <ValidationIssueItem key={`warning-${i}`} issue={warning} severity="warning" />
          ))}
        </div>
      )}
    </div>
  );
}

interface ValidationIssueItemProps {
  issue: ValidationIssue;
  severity: 'error' | 'warning' | 'info';
}

function ValidationIssueItem({ issue, severity }: ValidationIssueItemProps) {
  const Icon = severity === 'error' ? AlertCircle : severity === 'warning' ? AlertTriangle : Info;
  const colorClass =
    severity === 'error'
      ? 'text-red-500 bg-red-500/10 border-red-500/20'
      : severity === 'warning'
      ? 'text-amber-500 bg-amber-500/10 border-amber-500/20'
      : 'text-blue-500 bg-blue-500/10 border-blue-500/20';

  return (
    <div className={cn('flex items-start gap-2 p-2 rounded border text-xs', colorClass)}>
      <Icon className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="font-medium">{issue.message}</p>
        {(issue.expected !== undefined || issue.actual !== undefined) && (
          <p className="text-muted-foreground mt-0.5">
            {issue.expected !== undefined && <span>Expected: {issue.expected}</span>}
            {issue.expected !== undefined && issue.actual !== undefined && <span> | </span>}
            {issue.actual !== undefined && <span>Actual: {issue.actual}</span>}
          </p>
        )}
      </div>
    </div>
  );
}

// Tooltip-style validation summary
interface ValidationTooltipProps {
  errors?: ValidationIssue[];
  warnings?: ValidationIssue[];
}

export function ValidationTooltip({ errors = [], warnings = [] }: ValidationTooltipProps) {
  const hasIssues = errors.length > 0 || warnings.length > 0;

  if (!hasIssues) {
    return null;
  }

  return (
    <div className="absolute z-50 top-full left-0 mt-1 w-64 p-2 bg-popover border rounded-lg shadow-lg">
      <ValidationBadge errors={errors} warnings={warnings} showDetails />
    </div>
  );
}

// Hook-compatible validation state
export interface BlockValidationState {
  blockId: string;
  isValid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}
