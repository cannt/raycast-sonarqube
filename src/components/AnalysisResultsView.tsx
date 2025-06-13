import { Detail, ActionPanel, Action, Icon } from "@raycast/api";
import { useState } from "react";
import { suggestCodeFixes } from "../lib/aiService";
import { SonarQubeResults, SonarQubeIssue } from "../utils/sonarQubeResults";

type Props = {
  results: SonarQubeResults;
  interpretation: string;
  projectName: string;
};

/**
 * Component to display SonarQube analysis results with AI interpretation
 */
export default function AnalysisResultsView({ results, interpretation, projectName }: Props) {
  const [selectedIssue, setSelectedIssue] = useState<SonarQubeIssue | null>(null);
  const [suggestedFix, setSuggestedFix] = useState<string | null>(null);
  const [isLoadingFix, setIsLoadingFix] = useState(false);
  
  /**
   * Fetches AI-generated fix suggestion for a specific issue
   */
  const handleGetFixSuggestion = async (issue: SonarQubeIssue) => {
    setIsLoadingFix(true);
    try {
      const fix = await suggestCodeFixes(issue);
      setSuggestedFix(fix);
      setSelectedIssue(issue);
    } catch (error) {
      console.error("Error getting fix suggestion:", error);
    } finally {
      setIsLoadingFix(false);
    }
  };
  
  /**
   * Formats the analysis results as markdown for display
   */
  const formatResults = () => {
    // Get metric ratings for code quality
    const getMetricValue = (metricKey: string): string => {
      const metric = results.metrics.find(m => m.metric === metricKey);
      return metric ? metric.value : "N/A";
    };

    // Initialize markdown content
    let markdown = `# AI Analysis for ${projectName}\n\n`;
    
    // Add AI interpretation
    markdown += "## Summary\n\n";
    markdown += interpretation + "\n\n";
    
    // Add key metrics
    markdown += "## Key Metrics\n\n";
    if (results.metrics && results.metrics.length > 0) {
      markdown += "| Metric | Value |\n";
      markdown += "|--------|-------|\n";
      markdown += `| Bugs | ${getMetricValue("bugs")} |\n`;
      markdown += `| Vulnerabilities | ${getMetricValue("vulnerabilities")} |\n`;
      markdown += `| Code Smells | ${getMetricValue("code_smells")} |\n`;
      markdown += `| Coverage | ${getMetricValue("coverage")}% |\n`;
      markdown += `| Duplicated Lines | ${getMetricValue("duplicated_lines_density")}% |\n`;
      markdown += `| Reliability | ${formatRating(getMetricValue("reliability_rating"))} |\n`;
      markdown += `| Security | ${formatRating(getMetricValue("security_rating"))} |\n`;
      markdown += `| Maintainability | ${formatRating(getMetricValue("sqale_rating"))} |\n`;
    } else {
      markdown += "No metrics found.\n";
    }
    
    // Add issues section
    markdown += "\n## Issues\n\n";
    if (results.issues && results.issues.length > 0) {
      results.issues.slice(0, 10).forEach((issue, index) => {
        markdown += `### Issue ${index + 1}: ${issue.message}\n\n`;
        markdown += `- **Severity**: ${issue.severity}\n`;
        markdown += `- **Type**: ${issue.type}\n`;
        markdown += `- **File**: ${issue.component.split(':').pop()}\n`;
        markdown += `- **Line**: ${issue.line || 'N/A'}\n\n`;
      });
      
      if (results.issues.length > 10) {
        markdown += `\n*...and ${results.issues.length - 10} more issues*\n`;
      }
    } else {
      markdown += "No issues found. Great job!\n";
    }
    
    // Add AI fix suggestion if available
    if (selectedIssue && suggestedFix) {
      markdown += "\n## AI Fix Suggestion\n\n";
      markdown += `For issue: "${selectedIssue.message}"\n\n`;
      markdown += "```\n" + suggestedFix + "\n```\n";
    }
    
    return markdown;
  };
  
  /**
   * Format SonarQube rating (1-5) as text description
   */
  const formatRating = (rating: string): string => {
    switch (rating) {
      case "1.0":
        return "A (Good)";
      case "2.0":
        return "B (Fair)";
      case "3.0":
        return "C (Moderate)";
      case "4.0":
        return "D (Poor)";
      case "5.0":
        return "E (Very Poor)";
      default:
        return rating;
    }
  };
  
  return (
    <Detail
      markdown={formatResults()}
      actions={
        <ActionPanel>
          {results.issues && results.issues.length > 0 && (
            <ActionPanel.Submenu title="Get Fix Suggestion" icon={Icon.Code}>
              {results.issues.slice(0, 10).map((issue, index) => (
                <Action
                  key={index}
                  title={`Fix Issue ${index + 1}`}
                  icon={isLoadingFix ? Icon.Clock : Icon.Code}
                  onAction={() => handleGetFixSuggestion(issue)}
                />
              ))}
            </ActionPanel.Submenu>
          )}
          <Action.OpenInBrowser
            title="Open in SonarQube"
            url={`http://localhost:${9000}/dashboard?id=${results.projectKey}`}
          />
          <Action.CopyToClipboard
            title="Copy AI Analysis"
            content={interpretation}
          />
        </ActionPanel>
      }
    />
  );
}
