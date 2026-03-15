'use client';

/**
 * PRAnalysisCard Component
 * Displays PR analysis in a developer-friendly dashboard style UI
 */

import React from 'react';
import { PRAnalysisWithRiskScore, IssueType, IssueSeverity } from '@/app/types/prAnalysis';

interface PRAnalysisCardProps {
  analysis: PRAnalysisWithRiskScore;
  finalRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  isLoading?: boolean;
  onRetry?: () => void;
  repositoryData?: {
    changedFiles: string[];
    totalFiles: number;
  };
}

/**
 * Get color classes based on risk level
 */
function getRiskLevelColor(level: 'LOW' | 'MEDIUM' | 'HIGH'): string {
  switch (level) {
    case 'LOW':
      return 'bg-green-100 text-green-800 border-green-300';
    case 'MEDIUM':
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'HIGH':
      return 'bg-red-100 text-red-800 border-red-300';
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
function IssueCard({ issue, index }: { issue: any; index: number }) {
  return (
    <div className={`p-4 rounded ${getSeverityColor(issue.severity)}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">{getIssueTypeIcon(issue.type)}</span>
          <div>
            <h4 className="font-semibold text-sm capitalize">
              {issue.type}
              <span className={`ml-2 px-2 py-1 rounded text-xs font-bold ${
                issue.severity === 'HIGH' ? 'bg-red-200' :
                issue.severity === 'MEDIUM' ? 'bg-yellow-200' :
                'bg-blue-200'
              }`}>
                {issue.severity}
              </span>
            </h4>
            <p className="text-xs text-gray-600 mt-1">{issue.file}</p>
          </div>
        </div>
        <span className="text-xs bg-gray-200 px-2 py-1 rounded">#{index + 1}</span>
      </div>
      <p className="text-sm mb-2 text-gray-800">{issue.description}</p>
      <div className="bg-white p-2 rounded text-xs">
        <p className="font-semibold text-gray-700 mb-1">Suggestion:</p>
        <p className="text-gray-600">{issue.suggestion}</p>
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
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            <p className="mt-4 text-gray-600">Analyzing PR...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">PR Analysis Report</h2>
            <p className="text-blue-100">{analysis.summary}</p>
          </div>
          <div className={`px-4 py-2 rounded-full font-bold text-lg border-2 ${getRiskLevelColor(finalRiskLevel)}`}>
            {finalRiskLevel} RISK
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Risk Score Breakdown */}
        <div className="mb-8 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-bold text-lg mb-4 text-gray-800">Risk Assessment</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-3 rounded border">
              <p className="text-xs text-gray-600 mb-1">Diff Size Risk</p>
              <p className="text-xl font-bold text-blue-600">
                {(analysis.riskScoreBreakdown.diffSizeRisk * 100).toFixed(0)}%
              </p>
            </div>
            <div className="bg-white p-3 rounded border">
              <p className="text-xs text-gray-600 mb-1">Issue Count Risk</p>
              <p className="text-xl font-bold text-purple-600">
                {(analysis.riskScoreBreakdown.issueCountRisk * 100).toFixed(0)}%
              </p>
            </div>
            <div className="bg-white p-3 rounded border">
              <p className="text-xs text-gray-600 mb-1">Severity Risk</p>
              <p className="text-xl font-bold text-orange-600">
                {(analysis.riskScoreBreakdown.issueSeverityRisk * 100).toFixed(0)}%
              </p>
            </div>
            <div className="bg-white p-3 rounded border">
              <p className="text-xs text-gray-600 mb-1">Overall Score</p>
              <p className="text-xl font-bold text-red-600">
                {analysis.riskScoreBreakdown.finalRiskScore}%
              </p>
            </div>
          </div>
          <p className="text-sm text-gray-700 mt-4 italic">{analysis.riskScoreBreakdown.rationale}</p>
        </div>

        {/* Issues Statistics */}
        {analysis.issues.length > 0 && (
          <div className="mb-8">
            <h3 className="font-bold text-lg mb-4 text-gray-800">Issues Found: {analysis.issues.length}</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {issuesByType.bug > 0 && (
                <div className="bg-blue-50 p-3 rounded border border-blue-200">
                  <p className="text-2xl mb-1">🐛</p>
                  <p className="text-sm text-gray-600">Bugs</p>
                  <p className="text-xl font-bold text-blue-600">{issuesByType.bug}</p>
                </div>
              )}
              {issuesByType.security > 0 && (
                <div className="bg-red-50 p-3 rounded border border-red-200">
                  <p className="text-2xl mb-1">🔒</p>
                  <p className="text-sm text-gray-600">Security</p>
                  <p className="text-xl font-bold text-red-600">{issuesByType.security}</p>
                </div>
              )}
              {issuesByType.performance > 0 && (
                <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
                  <p className="text-2xl mb-1">⚡</p>
                  <p className="text-sm text-gray-600">Performance</p>
                  <p className="text-xl font-bold text-yellow-600">{issuesByType.performance}</p>
                </div>
              )}
              {issuesByType.maintainability > 0 && (
                <div className="bg-purple-50 p-3 rounded border border-purple-200">
                  <p className="text-2xl mb-1">🔧</p>
                  <p className="text-sm text-gray-600">Maintainability</p>
                  <p className="text-xl font-bold text-purple-600">{issuesByType.maintainability}</p>
                </div>
              )}
            </div>

            {/* Issues List */}
            <div className="space-y-4">
              {analysis.issues.map((issue, index) => (
                <IssueCard key={index} issue={issue} index={index} />
              ))}
            </div>
          </div>
        )}

        {analysis.issues.length === 0 && (
          <div className="mb-8 p-6 bg-green-50 rounded-lg border border-green-200 text-center">
            <p className="text-2xl mb-2">✅</p>
            <p className="text-lg font-semibold text-green-800">No Issues Found</p>
            <p className="text-sm text-green-700 mt-2">This PR looks good!</p>
          </div>
        )}

        {/* Improvements */}
        {analysis.improvements.length > 0 && (
          <div className="mb-8">
            <h3 className="font-bold text-lg mb-4 text-gray-800">Suggested Improvements</h3>
            <ul className="space-y-2">
              {analysis.improvements.map((improvement, index) => (
                <li key={index} className="flex items-start gap-3 p-3 bg-blue-50 rounded">
                  <span className="text-blue-600 font-bold mt-1">•</span>
                  <span className="text-gray-800">{improvement}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Confidence Score */}
        <div className="mb-8 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600 mb-2">Analysis Confidence</p>
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${
                  analysis.confidenceScore >= 0.8 ? 'bg-green-500' :
                  analysis.confidenceScore >= 0.6 ? 'bg-yellow-500' :
                  'bg-orange-500'
                }`}
                style={{ width: `${analysis.confidenceScore * 100}%` }}
              ></div>
            </div>
            <p className="font-semibold text-gray-800">{(analysis.confidenceScore * 100).toFixed(1)}%</p>
          </div>
        </div>
        {repositoryData && (
  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 mt-6">
    <h3 className="mb-2 font-semibold">Repository Impact</h3>

    <p className="text-sm mb-2">
      Total Files Changed: {repositoryData.totalFiles}
    </p>

    <ul className="list-disc pl-5 text-sm">
      {repositoryData.changedFiles.map((file, index) => (
        <li key={index}>{file}</li>
      ))}
    </ul>
  </div>
)}

        {/* Footer */}
        <div className="flex gap-4">
          {onRetry && (
            <button
              onClick={onRetry}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition font-semibold"
            >
              Re-analyze
            </button>
          )}
          <button
            onClick={() => window.print()}
            className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition font-semibold"
          >
            Print Report
          </button>
        </div>
      </div>
    </div>
  );
}
