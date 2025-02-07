
import { useState } from "react";
import { toast } from "sonner";
import JSZip from "jszip";
import { ExportConfiguration } from "@/components/ExportConfig";

const CORS_PROXY = "https://cors-anywhere.herokuapp.com/";
const MAX_RESULTS = 100;

interface Credentials {
  domain: string;
  email: string;
  token: string;
}

export const useJiraOperations = () => {
  const [credentials, setCredentials] = useState<Credentials | null>(null);
  const [progress, setProgress] = useState({ current: 0, total: 0, status: "" });
  const [rateLimitInfo, setRateLimitInfo] = useState<{ isLimited: boolean; resetTime: number }>({
    isLimited: false,
    resetTime: 0
  });

  const handleRateLimitError = (errorText: string) => {
    // Extract waiting time from error message (usually in the format "waiting time: X seconds")
    const waitingTimeMatch = errorText.match(/waiting time: (\d+) seconds/i);
    if (waitingTimeMatch) {
      const waitingTime = parseInt(waitingTimeMatch[1], 10);
      setRateLimitInfo({
        isLimited: true,
        resetTime: waitingTime
      });
      toast.error(`Rate limit reached. Please wait ${waitingTime} seconds before trying again.`);
    } else {
      // Default to 60 seconds if we can't parse the waiting time
      setRateLimitInfo({
        isLimited: true,
        resetTime: 60
      });
      toast.error("Rate limit reached. Please wait before trying again.");
    }
  };

  const resetRateLimit = () => {
    setRateLimitInfo({
      isLimited: false,
      resetTime: 0
    });
  };

  const handleResponse = async (response: Response) => {
    if (response.status === 429) {
      const errorText = await response.text();
      handleRateLimitError(errorText);
      throw new Error("Rate limit exceeded");
    }
    return response;
  };

  const fetchAttachments = async (issueKey: string) => {
    if (!credentials) return [];
    
    const cleanDomain = credentials.domain.replace(/\/+$/, '');
    const url = `${CORS_PROXY}${cleanDomain}/rest/api/2/issue/${issueKey}?fields=attachment`;
    
    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `Basic ${btoa(`${credentials.email}:${credentials.token}`)}`,
          "Content-Type": "application/json",
        },
      });

      const handledResponse = await handleResponse(response);
      
      if (!handledResponse.ok) {
        console.error(`Failed to fetch attachments for issue ${issueKey}`);
        return [];
      }

      const data = await handledResponse.json();
      return data.fields.attachment || [];
    } catch (error) {
      if (error instanceof Error && error.message === "Rate limit exceeded") {
        throw error;
      }
      console.error(`Failed to fetch attachments for issue ${issueKey}`, error);
      return [];
    }
  };

  const downloadAttachment = async (attachment: any) => {
    if (!credentials) return null;
    
    try {
      const response = await fetch(`${CORS_PROXY}${attachment.content}`, {
        headers: {
          Authorization: `Basic ${btoa(`${credentials.email}:${credentials.token}`)}`,
        },
      });

      const handledResponse = await handleResponse(response);

      if (!handledResponse.ok) {
        throw new Error(`Failed to download attachment: ${attachment.filename}`);
      }

      const blob = await handledResponse.blob();
      return {
        filename: attachment.filename,
        content: blob,
        mimeType: attachment.mimeType,
        size: attachment.size,
      };
    } catch (error) {
      if (error instanceof Error && error.message === "Rate limit exceeded") {
        throw error;
      }
      console.error(`Error downloading attachment: ${attachment.filename}`, error);
      return null;
    }
  };

  const fetchJiraIssues = async (config: ExportConfiguration) => {
    if (!credentials) {
      throw new Error("No JIRA credentials provided");
    }
    
    if (!config.projectKey) {
      throw new Error("Project key is required");
    }

    const cleanDomain = credentials.domain.replace(/\/+$/, '');
    
    const jqlQuery = `project = "${config.projectKey}" ${
      config.dateFrom || config.dateTo
        ? `AND created >= "${config.dateFrom}" AND created <= "${config.dateTo}"`
        : ""
    }`;

    try {
      const countUrl = `${CORS_PROXY}${cleanDomain}/rest/api/2/search?jql=${encodeURIComponent(
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

      const handledCountResponse = await handleResponse(countResponse);

      if (!handledCountResponse.ok) {
        const errorData = await handledCountResponse.json();
        throw new Error(
          `Failed to fetch JIRA issues count: ${
            errorData.errorMessages?.[0] || 'Unknown error'
          }`
        );
      }

      const countData = await handledCountResponse.json();
      const total = countData.total;
      let allIssues = [];

      for (let startAt = 0; startAt < total; startAt += MAX_RESULTS) {
        const url = `${CORS_PROXY}${cleanDomain}/rest/api/2/search?jql=${encodeURIComponent(
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

        const handledResponse = await handleResponse(response);

        if (!handledResponse.ok) {
          const errorData = await handledResponse.json();
          throw new Error(
            `Failed to fetch JIRA issues: ${
              errorData.errorMessages?.[0] || 'Unknown error'
            }`
          );
        }

        const data = await handledResponse.json();
        allIssues = [...allIssues, ...(data.issues || [])];
      }

      return allIssues;
    } catch (error) {
      if (error instanceof Error && error.message === "Rate limit exceeded") {
        throw error;
      }
      throw error;
    }
  };

  return {
    credentials,
    setCredentials,
    progress,
    setProgress,
    fetchAttachments,
    downloadAttachment,
    fetchJiraIssues,
    rateLimitInfo,
    resetRateLimit,
  };
};
