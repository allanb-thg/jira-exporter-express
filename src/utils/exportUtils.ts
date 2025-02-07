
import JSZip from "jszip";
import { toast } from "sonner";
import { ExportConfiguration } from "@/components/ExportConfig";

export const convertToCSV = (items: any[]) => {
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

export const downloadCSV = (csv: string, filename: string) => {
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

export const handleGitHubExport = async (
  config: ExportConfiguration,
  files: Array<{ path: string; content: string; encoding: string }>,
  projectKey: string,
  issues: any[]
) => {
  try {
    // Clean and parse the repository URL
    const repoUrl = new URL(config.githubRepo || "");
    const [, owner, repoName] = repoUrl.pathname
      .replace(/\.git$/, "")
      .split('/')
      .filter(Boolean);

    if (!owner || !repoName) {
      throw new Error('Invalid GitHub repository URL');
    }

    // First, create the files in the repository
    await Promise.all(files.map(file =>
      fetch(`https://api.github.com/repos/${owner}/${repoName}/contents/${file.path}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${config.githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'X-GitHub-Api-Version': '2022-11-28'
        },
        body: JSON.stringify({
          message: `Add ${file.path} from JIRA export`,
          content: file.content,
          branch: config.githubBranch || 'main'
        })
      }).then(async (response) => {
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`GitHub API Error: ${errorData.message}`);
        }
        return response.json();
      })
    ));

    // Get or create a GitHub Project
    const projectResponse = await fetch(`https://api.github.com/repos/${owner}/${repoName}/projects`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'X-GitHub-Api-Version': '2022-11-28'
      },
      body: JSON.stringify({
        name: `JIRA Export - ${projectKey}`,
        body: `Imported from JIRA project ${projectKey}`
      })
    });

    if (!projectResponse.ok) {
      throw new Error('Failed to create GitHub Project');
    }

    const projectData = await projectResponse.json();

    // Create project items for each JIRA issue
    for (const issue of issues) {
      await fetch(`https://api.github.com/projects/${projectData.id}/columns/1/cards`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'X-GitHub-Api-Version': '2022-11-28'
        },
        body: JSON.stringify({
          note: `JIRA Issue: ${issue.key}\n\n${issue.fields.summary}\n\n${issue.fields.description || ''}\n\nStatus: ${issue.fields.status.name}`
        })
      });
    }

    toast.success('Successfully exported files and created GitHub Project items!');
  } catch (error) {
    console.error('GitHub export failed:', error);
    toast.error(error instanceof Error ? error.message : 'Failed to export to GitHub. Please check your credentials and try again.');
    throw error;
  }
};
