
import { useState } from "react";
import { JiraConnectForm } from "@/components/JiraConnectForm";
import { ExportConfig, ExportConfiguration } from "@/components/ExportConfig";
import { ExportProgress } from "@/components/ExportProgress";
import { toast } from "sonner";
import JSZip from "jszip";
import { useJiraOperations } from "@/hooks/useJiraOperations";
import { convertToCSV, downloadCSV, handleGitHubExport } from "@/utils/exportUtils";

const Index = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  const {
    credentials,
    setCredentials,
    progress,
    setProgress,
    fetchAttachments,
    downloadAttachment,
    fetchJiraIssues,
  } = useJiraOperations();

  const handleConnect = async (domain: string, email: string, token: string) => {
    setCredentials({ domain, email, token });
    toast.success("Successfully connected to JIRA");
    setIsConnected(true);
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
        downloadCSV(csv, `jira-export-${config.projectKey}.csv`);

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

        const files = [
          {
            path: `data/${config.projectKey}/issues.csv`,
            content: btoa(csv),
            encoding: 'base64'
          }
        ];

        if (config.includeAttachments) {
          const zipContent = await zip.generateAsync({ type: "base64" });
          files.push({
            path: `data/${config.projectKey}/attachments.zip`,
            content: zipContent,
            encoding: 'base64'
          });
        }

        await handleGitHubExport(config, files, config.projectKey, issues);
      }

      setIsExporting(false);
      toast.success("Export completed successfully!");
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Export failed. Please check your connection and try again.");
      setIsExporting(false);
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
