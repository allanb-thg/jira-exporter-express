
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
  projectKey: string
) => {
  try {
    const repoUrl = new URL(config.githubRepo || "");
    const [, owner, repo] = repoUrl.pathname.split('/');
    const projectName = `JIRA Export - ${projectKey}`;

    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/projects`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.githubToken}`,
        'Accept': 'application/vnd.github.v3+json'
      },
      body: JSON.stringify({
        name: projectName,
        body: `JIRA export for project ${projectKey}`
      })
    });

    if (!response.ok) {
      throw new Error('Failed to create GitHub project');
    }

    await Promise.all(files.map(file =>
      fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${file.path}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${config.githubToken}`,
          'Accept': 'application/vnd.github.v3+json'
        },
        body: JSON.stringify({
          message: `Add ${file.path} from JIRA export`,
          content: file.content,
          branch: config.githubBranch
        })
      })
    ));

    toast.success('Successfully exported to GitHub project!');
  } catch (error) {
    console.error('GitHub export failed:', error);
    toast.error('Failed to export to GitHub. Please check your credentials and try again.');
    throw error;
  }
};
