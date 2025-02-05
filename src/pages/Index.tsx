import { useState } from "react";
import { JiraConnectForm } from "@/components/JiraConnectForm";
import { ExportConfig, ExportConfiguration } from "@/components/ExportConfig";
import { ExportProgress } from "@/components/ExportProgress";
import { toast } from "sonner";

const CORS_PROXY = "https://cors-anywhere.herokuapp.com/";
const MAX_RESULTS = 100; // Maximum results per request

const Index = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, status: "" });
  const [credentials, setCredentials] = useState<{
    domain: string;
    email: string;
    token: string;
  } | null>(null);

  const handleConnect = async (domain: string, email: string, token: string) => {
    setCredentials({ domain, email, token });
    toast.success("Successfully connected to JIRA");
    setIsConnected(true);
  };

  const fetchJiraIssues = async (config: ExportConfiguration) => {
    if (!credentials) return [];
    
    const jqlQuery = `project = ${config.projectKey} ${
      config.dateFrom || config.dateTo
        ? `AND created >= "${config.dateFrom}" AND created <= "${config.dateTo}"`
        : ""
    }`;

    // First, get total number of issues
    const countUrl = `${CORS_PROXY}${credentials.domain}/rest/api/2/search?jql=${encodeURIComponent(
      jqlQuery
    )}&maxResults=0`;

    const countResponse = await fetch(countUrl, {
      headers: {
        Authorization: `Basic ${btoa(
          `${credentials.email}:${credentials.token}`
        )}`,
        "Content-Type": "application/json",
      },
    });

    if (!countResponse.ok) {
      throw new Error("Failed to fetch JIRA issues count");
    }

    const countData = await countResponse.json();
    const total = countData.total;
    let allIssues = [];

    // Fetch issues in batches
    for (let startAt = 0; startAt < total; startAt += MAX_RESULTS) {
      const url = `${CORS_PROXY}${credentials.domain}/rest/api/2/search?jql=${encodeURIComponent(
        jqlQuery
      )}&maxResults=${MAX_RESULTS}&startAt=${startAt}`;

      setProgress({
        current: allIssues.length,
        total,
        status: `Fetching issues ${startAt + 1} to ${Math.min(
          startAt + MAX_RESULTS,
          total
        )} of ${total}...`,
      });

      const response = await fetch(url, {
        headers: {
          Authorization: `Basic ${btoa(
            `${credentials.email}:${credentials.token}`
          )}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch JIRA issues");
      }

      const data = await response.json();
      allIssues = [...allIssues, ...(data.issues || [])];
    }

    return allIssues;
  };

  const handleStartExport = async (config: ExportConfiguration) => {
    try {
      setIsExporting(true);
      setProgress({ current: 0, total: 0, status: "Fetching issues..." });

      const issues = await fetchJiraIssues(config);
      setProgress({ current: 0, total: issues.length, status: "Starting export..." });

      // Process each issue
      const processedIssues = [];
      for (let i = 0; i < issues.length; i++) {
        const issue = issues[i];
        
        // Process attachments if needed
        if (config.includeAttachments) {
          // Add attachment processing logic here
          setProgress({
            current: i + 1,
            total: issues.length,
            status: `Processing attachments for ${issue.key}...`,
          });
        }

        processedIssues.push({
          key: issue.key,
          summary: issue.fields.summary,
          description: issue.fields.description,
          status: issue.fields.status.name,
          created: issue.fields.created,
          // Add more fields as needed
        });

        setProgress({
          current: i + 1,
          total: issues.length,
          status: `Processed ${i + 1} of ${issues.length} issues...`,
        });
      }

      // Generate and download CSV
      const csv = convertToCSV(processedIssues);
      downloadCSV(csv, `jira-export-${config.projectKey}.csv`);

      setIsExporting(false);
      toast.success("Export completed successfully!");
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Export failed. Please check your connection and try again.");
      setIsExporting(false);
    }
  };

  const convertToCSV = (items: any[]) => {
    if (items.length === 0) return "";
    
    const headers = Object.keys(items[0]);
    const rows = [
      headers.join(","),
      ...items.map(item =>
        headers.map(header => JSON.stringify(item[header] || "")).join(",")
      ),
    ];
    
    return rows.join("\n");
  };

  const downloadCSV = (csv: string, filename: string) => {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-primary-800 mb-8">
            JIRA Export Tool
          </h1>
          
          <div className="bg-white rounded-lg shadow-sm p-6 space-y-8">
            {!isConnected ? (
              <>
                <h2 className="text-xl font-semibold mb-4">
                  Connect to JIRA
                </h2>
                <JiraConnectForm onConnect={handleConnect} />
              </>
            ) : (
              <>
                <h2 className="text-xl font-semibold mb-4">
                  Configure Export
                </h2>
                {!isExporting ? (
                  <ExportConfig onStartExport={handleStartExport} />
                ) : (
                  <ExportProgress {...progress} />
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
