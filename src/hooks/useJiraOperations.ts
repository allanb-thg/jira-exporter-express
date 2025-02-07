
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

  const fetchAttachments = async (issueKey: string) => {
    if (!credentials) return [];
    
    const cleanDomain = credentials.domain.replace(/\/+$/, '');
    const url = `${CORS_PROXY}${cleanDomain}/rest/api/2/issue/${issueKey}?fields=attachment`;
    
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

    if (!countResponse.ok) {
      const errorData = await countResponse.json();
      throw new Error(
        `Failed to fetch JIRA issues count: ${
          errorData.errorMessages?.[0] || 'Unknown error'
        }`
      );
    }

    const countData = await countResponse.json();
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

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `Failed to fetch JIRA issues: ${
            errorData.errorMessages?.[0] || 'Unknown error'
          }`
        );
      }

      const data = await response.json();
      allIssues = [...allIssues, ...(data.issues || [])];
    }

    return allIssues;
  };

  return {
    credentials,
    setCredentials,
    progress,
    setProgress,
    fetchAttachments,
    downloadAttachment,
    fetchJiraIssues,
  };
};
