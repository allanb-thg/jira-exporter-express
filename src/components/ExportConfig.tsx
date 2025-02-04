import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useState } from "react";

interface ExportConfigProps {
  onStartExport: (config: ExportConfiguration) => void;
}

export interface ExportConfiguration {
  projectKey: string;
  includeAttachments: boolean;
  dateFrom: string;
  dateTo: string;
}

export function ExportConfig({ onStartExport }: ExportConfigProps) {
  const [config, setConfig] = useState<ExportConfiguration>({
    projectKey: "",
    includeAttachments: true,
    dateFrom: "",
    dateTo: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onStartExport(config);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 w-full max-w-md">
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
      <Button type="submit" className="w-full">
        Start Export
      </Button>
    </form>
  );
}