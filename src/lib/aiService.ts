import { AI } from "@raycast/api";

/**
 * Uses AI to interpret SonarQube analysis results and provide a human-readable summary
 * @param analysisResults The raw SonarQube analysis results
 * @returns A human-readable interpretation of the analysis
 */
export async function interpretAnalysisResults(analysisResults: any): Promise<string> {
  // Prepare a more structured summary for the AI
  const metrics = analysisResults.metrics || [];
  const issues = analysisResults.issues || [];
  
  // Create a summarized version to avoid token limits
  const summary = {
    metrics: metrics.map((m: any) => ({ metric: m.metric, value: m.value })),
    issueCount: issues.length,
    issueTypes: countIssueTypes(issues),
    topIssues: issues.slice(0, 5).map((issue: any) => ({
      message: issue.message,
      severity: issue.severity,
      type: issue.type,
      component: issue.component,
      line: issue.line,
    })),
  };
  
  return AI.ask(
    `Interpret these SonarQube analysis results and summarize the main issues in simple terms: ${JSON.stringify(summary)}`,
    {
      creativity: 0.3,
      system: "You are a SonarQube expert. Provide clear and concise explanations of code quality issues. Focus on the most serious issues first. Keep your response under 500 words."
    }
  );
}

/**
 * Uses AI to suggest code fixes for SonarQube issues
 * @param issueDetails Details about the SonarQube issue
 * @returns Suggested code fix
 */
export async function suggestCodeFixes(issueDetails: any): Promise<string> {
  return AI.ask(
    `I have a SonarQube issue in my code that needs fixing:
    - Issue message: ${issueDetails.message}
    - Issue type: ${issueDetails.type}
    - Issue severity: ${issueDetails.severity}
    - In file: ${issueDetails.component}
    - On line: ${issueDetails.line || 'unknown'}
    
    Can you suggest code to fix this issue? Be specific and follow best practices.`,
    {
      creativity: 0.3,
      system: "You are a SonarQube expert. Provide concise code fixes that follow best practices. Explain why your solution works. Keep your response under 400 words."
    }
  );
}

/**
 * Helper function to count issue types
 */
function countIssueTypes(issues: any[]): Record<string, number> {
  const counts: Record<string, number> = {};
  
  issues.forEach((issue) => {
    const type = issue.type || 'unknown';
    counts[type] = (counts[type] || 0) + 1;
  });
  
  return counts;
}
