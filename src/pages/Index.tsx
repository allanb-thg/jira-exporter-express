
import { useState } from "react";
import { JiraConnectForm } from "@/components/JiraConnectForm";
import { ExportConfig, ExportConfiguration } from "@/components/ExportConfig";
import { ExportProgress } from "@/components/ExportProgress";
import { toast } from "sonner";
import JSZip from "jszip";

const CORS_PROXY = "https://cors-anywhere.herokuapp.com/";
const MAX_RESULTS = 100;

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

  const fetchAttachments = async (issueKey: string) => {
    if (!credentials) return [];
    
    const url = `${CORS_PROXY}${credentials.domain}/rest/api/2/issue/${issueKey}?fields=attachment`;
    
    const response = await fetch(url, {
      headers: {
        Authorization: `Basic ${btoa(`${credentials.email}:${credentials.token}`)}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.error(`Failed to fetch attachments for issue ${issueKey}`);
      return [];
    }

    const data = await response.json();
    return data.fields.attachment || [];
  };

  const downloadAttachment = async (attachment: any) => {
    if (!credentials) return null;
    
    try {
      const response = await fetch(`${CORS_PROXY}${attachment.content}`, {
        headers: {
          Authorization: `Basic ${btoa(`${credentials.email}:${credentials.token}`)}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to download attachment: ${attachment.filename}`);
      }

      const blob = await response.blob();
      return {
        filename: attachment.filename,
        content: blob,
        mimeType: attachment.mimeType,
        size: attachment.size,
      };
    } catch (error) {
      console.error(`Error downloading attachment: ${attachment.filename}`, error);
      return null;
    }
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

      const processedIssues = [];
      const zip = new JSZip();
      
      for (let i = 0; i < issues.length; i++) {
        const issue = issues[i];
        let attachmentData = [];
        
        if (config.includeAttachments) {
          setProgress({
            current: i + 1,
            total: issues.length,
            status: `Fetching attachments for ${issue.key}...`,
          });
          
          const attachments = await fetchAttachments(issue.key);
          for (const attachment of attachments) {
            const downloadedAttachment = await downloadAttachment(attachment);
            if (downloadedAttachment) {
              const folderPath = `attachments/${issue.key}/`;
              zip.file(folderPath + downloadedAttachment.filename, downloadedAttachment.content);
              
              attachmentData.push({
                filename: downloadedAttachment.filename,
                size: downloadedAttachment.size,
                mimeType: downloadedAttachment.mimeType,
                url: attachment.content,
              });
            }
          }
        }

        processedIssues.push({
          key: issue.key,
          summary: issue.fields.summary,
          description: issue.fields.description,
          status: issue.fields.status.name,
          created: issue.fields.created,
          attachments: attachmentData,
        });

        setProgress({
          current: i + 1,
          total: issues.length,
          status: `Processed ${i + 1} of ${issues.length} issues...`,
        });
      }

      const csv = convertToCSV(processedIssues);

      if (config.exportType === "download") {
        // Download CSV locally
        downloadCSV(csv, `jira-export-${config.projectKey}.csv`);

        // Download attachments zip if there are any
        if (config.includeAttachments) {
          const zipContent = await zip.generateAsync({ type: "blob" });
          const zipUrl = URL.createObjectURL(zipContent);
          const link = document.createElement("a");
          link.href = zipUrl;
          link.download = `jira-attachments-${config.projectKey}.zip`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(zipUrl);
        }
      } else if (config.exportType === "github" && config.githubRepo) {
        setProgress({
          current: issues.length,
          total: issues.length,
          status: "Preparing GitHub export...",
        });

        // Convert GitHub URL to API format
        const repoUrl = new URL(config.githubRepo);
        const [, owner, repo] = repoUrl.pathname.split('/');
        
        // Prepare files for GitHub
        const files = [
          {
            path: `exports/${config.projectKey}/data.csv`,
            content: csv
          }
        ];

        if (config.includeAttachments) {
          const zipContent = await zip.generateAsync({ type: "base64" });
          files.push({
            path: `exports/${config.projectKey}/attachments.zip`,
            content: zipContent
          });
        }

        // Create GitHub commit
        const commitMessage = `Export JIRA data for project ${config.projectKey}`;
        
        try {
          // Note: This is a placeholder for GitHub API integration
          // In a real implementation, we would:
          // 1. Use GitHub API to create/update files
          // 2. Handle authentication
          // 3. Create commits and push changes
          toast.error("GitHub export is not yet implemented. Please use local download for now.");
        } catch (error) {
          console.error("GitHub export failed:", error);
          toast.error("Failed to export to GitHub. Please try again or use local download.");
        }
      }

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
        headers.map(header => {
          const value = item[header];
          if (header === 'attachments' && Array.isArray(value)) {
            return JSON.stringify(value.map(att => att.filename)).replace(/"/g, '""');
          }
          return JSON.stringify(value || "").replace(/"/g, '""');
        }).join(",")
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
