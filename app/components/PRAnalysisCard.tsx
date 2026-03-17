'use client';

/**
 * PRAnalysisCard Component
 * Displays PR analysis in a developer-friendly dashboard style UI
 */

import React from 'react';
import { PRAnalysisWithRiskScore, IssueType, IssueSeverity, BlastRadius, PRIssue, ComplianceResult } from '@/app/types/prAnalysis';

interface PRAnalysisCardProps {
  analysis: PRAnalysisWithRiskScore;
  finalRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  isLoading?: boolean;
  onRetry?: () => void;
  repositoryData?: {
    changedFiles: string[];
    totalFiles: number;
  };
  blastRadius?: BlastRadius | null;
  compliance?: ComplianceResult | null;
  expandedLayer?: string | null;
  setExpandedLayer?: (layer: string | null) => void;
}

/**
 * Get color classes based on risk level
 */
function getRiskLevelColor(level: 'LOW' | 'MEDIUM' | 'HIGH'): string {
  switch (level) {
    case 'LOW':
      return 'bg-green-900 text-green-300 border-green-500';
    case 'MEDIUM':
      return 'bg-yellow-900 text-yellow-300 border-yellow-500';
    case 'HIGH':
      return 'bg-red-900 text-red-300 border-red-500';
  }
}

/**
 * Get color classes based on changeType
 */
function getChangeTypeBadgeColor(changeType: 'core' | 'supporting' | 'config'): string {
  switch (changeType) {
    case 'core':
      return 'bg-red-600 text-red-100';
    case 'supporting':
      return 'bg-blue-600 text-blue-100';
    case 'config':
      return 'bg-gray-600 text-gray-100';
  }
}

/**
 * Get color classes based on issue severity
 */
function getSeverityColor(severity: IssueSeverity): string {
  switch (severity) {
    case 'LOW':
      return 'bg-blue-50 border-l-4 border-blue-500';
    case 'MEDIUM':
      return 'bg-yellow-50 border-l-4 border-yellow-500';
    case 'HIGH':
      return 'bg-red-50 border-l-4 border-red-500';
  }
}

/**
 * Get icon for issue type
 */
function getIssueTypeIcon(type: IssueType): string {
  switch (type) {
    case 'bug':
      return '🐛';
    case 'security':
      return '🔒';
    case 'performance':
      return '⚡';
    case 'maintainability':
      return '🔧';
  }
}

/**
 * Issue Card Component
 */
function IssueCard({ issue, index }: { issue: PRIssue; index: number }) {
  const severityColorMap: Record<IssueSeverity, { bg: string; border: string; text: string }> = {
    LOW: { bg: 'bg-blue-900', border: 'border-blue-700', text: 'text-blue-300' },
    MEDIUM: { bg: 'bg-yellow-900', border: 'border-yellow-700', text: 'text-yellow-300' },
    HIGH: { bg: 'bg-red-900', border: 'border-red-700', text: 'text-red-300' },
  };

  const colors = severityColorMap[issue.severity];

  return (
    <div className={`p-4 rounded border ${colors.bg} ${colors.border}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{getIssueTypeIcon(issue.type)}</span>
          <div>
            <h4 className="font-semibold text-sm capitalize text-gray-100">
              {issue.type}
              <span className={`ml-2 px-2 py-1 rounded text-xs font-bold ${
                issue.severity === 'HIGH' ? 'bg-red-700 text-red-200' :
                issue.severity === 'MEDIUM' ? 'bg-yellow-700 text-yellow-200' :
                'bg-blue-700 text-blue-200'
              }`}>
                {issue.severity}
              </span>
            </h4>
            <p className="text-xs text-gray-400 mt-1">{issue.file}</p>
          </div>
        </div>
        <span className="text-xs bg-gray-700 text-gray-200 px-2 py-1 rounded">#{index + 1}</span>
      </div>
      <p className="text-sm mb-3 text-gray-200">{issue.description}</p>
      <div className="bg-gray-900 p-3 rounded text-xs border border-gray-700">
        <p className="font-semibold text-cyan-400 mb-1">💡 Suggestion:</p>
        <p className="text-gray-300">{issue.suggestion}</p>
      </div>
    </div>
  );
}

/**
 * Main PRAnalysisCard Component
 */
export default function PRAnalysisCard({
  analysis,
  finalRiskLevel,
  isLoading = false,
  onRetry,
  repositoryData,
  blastRadius,
  compliance,
  expandedLayer,
  setExpandedLayer,
}: PRAnalysisCardProps) {
  const issuesByType: Record<IssueType, number> = {
    bug: 0,
    security: 0,
    performance: 0,
    maintainability: 0,
  };

  for (const issue of analysis.issues) {
    issuesByType[issue.type]++;
  }

  if (isLoading) {
    return (
      <div className="bg-gray-900 rounded-lg shadow-lg p-8 border border-gray-700">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
            <p className="mt-4 text-gray-400">Analyzing PR...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-lg shadow-2xl overflow-hidden border border-gray-700">
      {/* Header - Vibrant Gradient */}
      <div className="bg-gradient-to-r from-cyan-500 via-purple-500 to-blue-600 text-white p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-3xl font-bold mb-2 drop-shadow-lg">PR Analysis Report</h2>
            <p className="text-cyan-50 drop-shadow-md text-lg">{analysis.summary}</p>
          </div>
          <div className={`px-6 py-3 rounded-full font-bold text-lg border-2 shadow-lg ${getRiskLevelColor(finalRiskLevel)}`}>
            {finalRiskLevel} RISK
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 bg-gray-900">
        {/* Risk Score Breakdown */}
        <div className="mb-8 p-5 bg-gray-800 rounded-lg border border-gray-700">
          <h3 className="font-bold text-xl mb-4 text-cyan-400">Risk Assessment</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-900 p-4 rounded border border-purple-500 hover:border-purple-400 transition">
              <p className="text-xs text-gray-300 mb-1">Diff Size Risk</p>
              <p className="text-2xl font-bold text-purple-400">
                {(analysis.riskScoreBreakdown.diffSizeRisk * 100).toFixed(0)}%
              </p>
            </div>
            <div className="bg-gray-900 p-4 rounded border border-violet-500 hover:border-violet-400 transition">
              <p className="text-xs text-gray-300 mb-1">Issue Count Risk</p>
              <p className="text-2xl font-bold text-violet-400">
                {(analysis.riskScoreBreakdown.issueCountRisk * 100).toFixed(0)}%
              </p>
            </div>
            <div className="bg-gray-900 p-4 rounded border border-orange-500 hover:border-orange-400 transition">
              <p className="text-xs text-gray-300 mb-1">Severity Risk</p>
              <p className="text-2xl font-bold text-orange-400">
                {(analysis.riskScoreBreakdown.issueSeverityRisk * 100).toFixed(0)}%
              </p>
            </div>
            <div className="bg-gray-900 p-4 rounded border border-red-500 hover:border-red-400 transition">
              <p className="text-xs text-gray-300 mb-1">Overall Score</p>
              <p className="text-2xl font-bold text-red-400">
                {analysis.riskScoreBreakdown.finalRiskScore}%
              </p>
            </div>
          </div>
          <p className="text-sm text-gray-300 mt-4 italic border-l-2 border-cyan-500 pl-3">{analysis.riskScoreBreakdown.rationale}</p>
        </div>

        {/* Issues Statistics */}
        {analysis.issues.length > 0 && (
          <div className="mb-8">
            <h3 className="font-bold text-xl mb-4 text-cyan-400">Issues Found: {analysis.issues.length}</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {issuesByType.bug > 0 && (
                <div className="bg-gray-800 p-4 rounded border border-blue-500 hover:border-blue-400 transition">
                  <p className="text-2xl mb-2">🐛</p>
                  <p className="text-sm text-gray-300">Bugs</p>
                  <p className="text-2xl font-bold text-blue-400">{issuesByType.bug}</p>
                </div>
              )}
              {issuesByType.security > 0 && (
                <div className="bg-gray-800 p-4 rounded border border-red-500 hover:border-red-400 transition">
                  <p className="text-2xl mb-2">🔒</p>
                  <p className="text-sm text-gray-300">Security</p>
                  <p className="text-2xl font-bold text-red-400">{issuesByType.security}</p>
                </div>
              )}
              {issuesByType.performance > 0 && (
                <div className="bg-gray-800 p-4 rounded border border-orange-500 hover:border-orange-400 transition">
                  <p className="text-2xl mb-2">⚡</p>
                  <p className="text-sm text-gray-300">Performance</p>
                  <p className="text-2xl font-bold text-orange-400">{issuesByType.performance}</p>
                </div>
              )}
              {issuesByType.maintainability > 0 && (
                <div className="bg-gray-800 p-4 rounded border border-purple-500 hover:border-purple-400 transition">
                  <p className="text-2xl mb-2">🔧</p>
                  <p className="text-sm text-gray-300">Maintainability</p>
                  <p className="text-2xl font-bold text-purple-400">{issuesByType.maintainability}</p>
                </div>
              )}
            </div>

            {/* Issues List */}
            <div className="space-y-3">
              {analysis.issues.map((issue, index) => (
                <IssueCard key={index} issue={issue} index={index} />
              ))}
            </div>
          </div>
        )}

        {analysis.issues.length === 0 && (
          <div className="mb-8 p-6 bg-gray-800 rounded-lg border border-green-500 text-center">
            <p className="text-4xl mb-2">✅</p>
            <p className="text-lg font-semibold text-green-400">No Issues Found</p>
            <p className="text-sm text-gray-300 mt-2">This PR looks good!</p>
          </div>
        )}

        {/* Improvements */}
        {analysis.improvements.length > 0 && (
          <div className="mb-8">
            <h3 className="font-bold text-xl mb-4 text-cyan-400">Suggested Improvements</h3>
            <ul className="space-y-2">
              {analysis.improvements.map((improvement, index) => (
                <li key={index} className="flex items-start gap-3 p-3 bg-gray-800 rounded border border-green-600 hover:border-green-500 transition">
                  <span className="text-green-400 font-bold mt-1">✓</span>
                  <span className="text-gray-100">{improvement}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Confidence Score */}
        <div className="mb-8 p-4 bg-gray-800 rounded-lg border border-gray-700">
          <p className="text-sm text-gray-300 mb-2">Analysis Confidence</p>
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-gray-700 rounded-full h-3">
              <div
                className={`h-3 rounded-full ${
                  analysis.confidenceScore >= 0.8 ? 'bg-green-500' :
                  analysis.confidenceScore >= 0.6 ? 'bg-yellow-500' :
                  'bg-orange-500'
                }`}
                style={{ width: `${analysis.confidenceScore * 100}%` }}
              ></div>
            </div>
            <p className="font-semibold text-cyan-400 w-16">{(analysis.confidenceScore * 100).toFixed(1)}%</p>
          </div>
        </div>
        {repositoryData && (
  <div className="rounded-lg border border-cyan-600 bg-gray-800 p-5 mt-6">
    <h3 className="mb-3 font-semibold text-cyan-400 text-lg">Repository Impact</h3>

    <p className="text-sm mb-3 text-gray-200">
      Total Files Changed: <span className="text-cyan-400 font-bold">{repositoryData.totalFiles}</span>
    </p>

    <ul className="list-disc pl-5 text-sm text-gray-300 space-y-1">
      {repositoryData.changedFiles.map((file, index) => (
        <li key={index} className="text-gray-300 hover:text-cyan-400 transition">{file}</li>
      ))}
    </ul>
  </div>
)}

        {/* Blast Radius Section - Pro Version */}
        {blastRadius && (
          <div className="rounded-lg border border-purple-600 bg-gray-800 p-6 mt-6">
            <h3 className="mb-4 text-lg font-semibold text-purple-400">Blast Radius Pro</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="bg-gray-900 p-4 rounded border border-purple-500">
                <p className="text-xs text-gray-400 mb-1">Impact Score</p>
                <p className="text-4xl font-bold text-purple-400">{blastRadius.impactScore}</p>
              </div>
              <div className="bg-gray-900 p-4 rounded border border-purple-500">
                <p className="text-xs text-gray-400 mb-1">Layers Affected</p>
                <p className="text-4xl font-bold text-purple-400">{blastRadius.affectedLayers.length}</p>
              </div>
            </div>

            {blastRadius.affectedLayers.length > 0 && (
              <div className="mb-4">
                <p className="text-sm font-semibold text-purple-400 mb-3">Affected Layers</p>
                <ul className="space-y-2">
                  {blastRadius.affectedLayers.map((layer) => {
                    const isExpanded = expandedLayer === layer;
                    const layerDetail = blastRadius.layerDetails?.[layer];
                    
                    return (
                      <div key={layer} className="rounded border border-purple-700 overflow-hidden">
                        <button
                          onClick={() => setExpandedLayer?.(isExpanded ? null : layer)}
                          className="w-full flex items-center gap-2 p-3 bg-gray-900 hover:bg-gray-850 transition cursor-pointer text-left"
                        >
                          <span className="text-purple-400 font-bold">{isExpanded ? '▼' : '▶'}</span>
                          <span className="text-sm text-gray-200 font-medium flex-1">{layer} Layer</span>
                          {blastRadius.layerCounts[layer] && (
                            <span className="text-xs text-gray-300 bg-purple-900 px-2 py-1 rounded">
                              {blastRadius.layerCounts[layer]} file{blastRadius.layerCounts[layer] !== 1 ? 's' : ''}
                            </span>
                          )}
                        </button>

                        {isExpanded && layerDetail && (
                          <div className="bg-gray-800 border-t border-purple-700 p-3 space-y-2 max-h-96 overflow-y-auto">
                            {layerDetail.files.map((file, idx) => (
                              <div key={idx} className="pl-6 py-2 border-l-2 border-purple-600 hover:border-purple-400 transition">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      {file.isCritical && (
                                        <span className="text-red-400 font-bold text-lg">🔥</span>
                                      )}
                                      <p className="text-xs font-mono text-gray-300 truncate" title={file.path}>
                                        {file.path}
                                      </p>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1">{file.reason}</p>
                                  </div>
                                  <span className={`px-2 py-1 rounded text-xs font-semibold whitespace-nowrap flex-shrink-0 ${getChangeTypeBadgeColor(file.changeType)}`}>
                                    [{file.changeType}]
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </ul>
              </div>
            )}

            <div className="p-3 bg-gray-900 rounded border border-purple-700">
              <p className="text-sm text-gray-300 italic">{blastRadius.explanation}</p>
            </div>
          </div>
        )}

        {/* Compliance & Security Section */}
        {compliance && (
          <div className="rounded-lg border border-orange-600 bg-gray-800 p-6 mt-6">
            <h3 className="mb-4 text-lg font-semibold text-orange-400">Compliance & Security</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="bg-gray-900 p-4 rounded border border-orange-500">
                <p className="text-xs text-gray-400 mb-1">Risk Level</p>
                <p className={`text-2xl font-bold ${
                  compliance.riskLevel === 'HIGH' ? 'text-red-400' :
                  compliance.riskLevel === 'MEDIUM' ? 'text-yellow-400' :
                  'text-green-400'
                }`}>
                  {compliance.riskLevel}
                </p>
              </div>
              <div className="bg-gray-900 p-4 rounded border border-orange-500">
                <p className="text-xs text-gray-400 mb-1">Flags Detected</p>
                <p className="text-2xl font-bold text-orange-400">
                  {Object.values(compliance.flags).filter(Boolean).length}/4
                </p>
              </div>
            </div>

            {/* Compliance Flags */}
            <div className="mb-4">
              <p className="text-sm font-semibold text-orange-400 mb-2">Sensitive Areas Detected</p>
              <div className="space-y-2">
                {compliance.flags.auth && (
                  <div className="flex items-center gap-2 p-2 bg-gray-900 rounded border border-orange-700 hover:border-orange-500 transition">
                    <span className="text-orange-400 font-bold">⚠</span>
                    <span className="text-sm text-gray-200">Authentication Logic Changed</span>
                  </div>
                )}
                {compliance.flags.payment && (
                  <div className="flex items-center gap-2 p-2 bg-gray-900 rounded border border-orange-700 hover:border-orange-500 transition">
                    <span className="text-orange-400 font-bold">⚠</span>
                    <span className="text-sm text-gray-200">Payment Flow Detected</span>
                  </div>
                )}
                {compliance.flags.pii && (
                  <div className="flex items-center gap-2 p-2 bg-gray-900 rounded border border-orange-700 hover:border-orange-500 transition">
                    <span className="text-orange-400 font-bold">⚠</span>
                    <span className="text-sm text-gray-200">PII Data Impacted</span>
                  </div>
                )}
                {compliance.flags.security && (
                  <div className="flex items-center gap-2 p-2 bg-gray-900 rounded border border-orange-700 hover:border-orange-500 transition">
                    <span className="text-orange-400 font-bold">⚠</span>
                    <span className="text-sm text-gray-200">Security-Critical Code Modified</span>
                  </div>
                )}
                {!Object.values(compliance.flags).some(Boolean) && (
                  <div className="flex items-center gap-2 p-2 bg-gray-900 rounded border border-green-700 hover:border-green-500 transition">
                    <span className="text-green-400 font-bold">✓</span>
                    <span className="text-sm text-gray-200">No sensitive areas detected</span>
                  </div>
                )}
              </div>
            </div>

            {/* Warnings */}
            {compliance.warnings.length > 0 && (
              <div className="p-3 bg-gray-900 rounded border border-orange-700 mb-4">
                <p className="text-sm font-semibold text-orange-400 mb-2">Compliance Warnings</p>
                <ul className="space-y-2">
                  {compliance.warnings.map((warning, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-gray-300">
                      <span className="text-orange-400 font-bold mt-0.5">•</span>
                      <span>{warning}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Compliance File Mapping */}
            {(compliance.details.authFiles.length > 0 ||
              compliance.details.paymentFiles.length > 0 ||
              compliance.details.piiFiles.length > 0 ||
              compliance.details.securityFiles.length > 0) && (
              <div className="p-4 bg-gray-900 rounded border border-orange-700">
                <p className="text-sm font-semibold text-orange-400 mb-3">Affected Files by Category</p>
                <div className="space-y-3">
                  {compliance.details.authFiles.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-orange-400 mb-1">🔐 Auth Files</p>
                      <ul className="space-y-1 ml-2">
                        {compliance.details.authFiles.map((file, idx) => (
                          <li key={idx} className="text-xs text-gray-300 font-mono truncate" title={file}>
                            • {file}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {compliance.details.paymentFiles.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-orange-400 mb-1">💳 Payment Files</p>
                      <ul className="space-y-1 ml-2">
                        {compliance.details.paymentFiles.map((file, idx) => (
                          <li key={idx} className="text-xs text-gray-300 font-mono truncate" title={file}>
                            • {file}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {compliance.details.piiFiles.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-orange-400 mb-1">👤 PII Files</p>
                      <ul className="space-y-1 ml-2">
                        {compliance.details.piiFiles.map((file, idx) => (
                          <li key={idx} className="text-xs text-gray-300 font-mono truncate" title={file}>
                            • {file}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {compliance.details.securityFiles.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-orange-400 mb-1">🛡️ Security Files</p>
                      <ul className="space-y-1 ml-2">
                        {compliance.details.securityFiles.map((file, idx) => (
                          <li key={idx} className="text-xs text-gray-300 font-mono truncate" title={file}>
                            • {file}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex gap-4 mt-8">
          {onRetry && (
            <button
              onClick={onRetry}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 transition font-semibold shadow-lg"
            >
              Re-analyze
            </button>
          )}
          <button
            onClick={() => window.print()}
            className="flex-1 px-4 py-3 bg-gray-700 text-gray-100 rounded-lg hover:bg-gray-600 transition font-semibold"
          >
            Print Report
          </button>
        </div>
      </div>
    </div>
  );
}
