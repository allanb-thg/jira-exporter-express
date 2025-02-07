
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useState } from "react";

interface ExportConfigProps {
  onStartExport: (config: ExportConfiguration) => void;
}

export interface ExportConfiguration {
  projectKey: string;
  includeAttachments: boolean;
  dateFrom: string;
  dateTo: string;
  exportType: "download" | "github";
  githubRepo?: string;
  githubBranch?: string;
  githubToken?: string;
}

export function ExportConfig({ onStartExport }: ExportConfigProps) {
  const [config, setConfig] = useState<ExportConfiguration>({
    projectKey: "",
    includeAttachments: true,
    dateFrom: "",
    dateTo: "",
    exportType: "download",
    githubRepo: "",
    githubBranch: "main",
    githubToken: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onStartExport(config);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 w-full max-w-md">
      <div>
        <label htmlFor="projectKey" className="block text-sm font-medium mb-1">
          Project Key
        </label>
        <Input
          id="projectKey"
          placeholder="e.g., PROJ"
          value={config.projectKey}
          onChange={(e) =>
            setConfig({ ...config, projectKey: e.target.value })
          }
        />
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="attachments"
          checked={config.includeAttachments}
          onCheckedChange={(checked) =>
            setConfig({ ...config, includeAttachments: checked as boolean })
          }
        />
        <label
          htmlFor="attachments"
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          Include Attachments
        </label>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="dateFrom" className="block text-sm font-medium mb-1">
            From Date
          </label>
          <Input
            id="dateFrom"
            type="date"
            value={config.dateFrom}
            onChange={(e) =>
              setConfig({ ...config, dateFrom: e.target.value })
            }
          />
        </div>
        <div>
          <label htmlFor="dateTo" className="block text-sm font-medium mb-1">
            To Date
          </label>
          <Input
            id="dateTo"
            type="date"
            value={config.dateTo}
            onChange={(e) => setConfig({ ...config, dateTo: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-4">
        <Label>Export Type</Label>
        <RadioGroup
          value={config.exportType}
          onValueChange={(value: "download" | "github") =>
            setConfig({ ...config, exportType: value })
          }
          className="flex flex-col space-y-2"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="download" id="download" />
            <Label htmlFor="download">Download Locally</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="github" id="github" />
            <Label htmlFor="github">Send to GitHub</Label>
          </div>
        </RadioGroup>
      </div>

      {config.exportType === "github" && (
        <div className="space-y-4">
          <div>
            <label htmlFor="githubRepo" className="block text-sm font-medium mb-1">
              GitHub Repository URL
            </label>
            <Input
              id="githubRepo"
              placeholder="https://github.com/username/repo"
              value={config.githubRepo}
              onChange={(e) =>
                setConfig({ ...config, githubRepo: e.target.value })
              }
            />
          </div>
          <div>
            <label htmlFor="githubBranch" className="block text-sm font-medium mb-1">
              Branch Name
            </label>
            <Input
              id="githubBranch"
              placeholder="main"
              value={config.githubBranch}
              onChange={(e) =>
                setConfig({ ...config, githubBranch: e.target.value })
              }
            />
          </div>
          <div>
            <label htmlFor="githubToken" className="block text-sm font-medium mb-1">
              GitHub Personal Access Token
            </label>
            <Input
              id="githubToken"
              type="password"
              placeholder="ghp_xxxxxxxxxxxx"
              value={config.githubToken}
              onChange={(e) =>
                setConfig({ ...config, githubToken: e.target.value })
              }
            />
            <p className="text-sm text-gray-500 mt-1">
              Token needs repo and project permissions
            </p>
          </div>
        </div>
      )}

      <Button type="submit" className="w-full">
        Start Export
      </Button>
    </form>
  );
}
