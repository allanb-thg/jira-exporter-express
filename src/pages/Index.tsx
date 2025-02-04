import { useState } from "react";
import { JiraConnectForm } from "@/components/JiraConnectForm";
import { ExportConfig, ExportConfiguration } from "@/components/ExportConfig";
import { ExportProgress } from "@/components/ExportProgress";
import { toast } from "sonner";

const Index = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, status: "" });

  const handleConnect = async (domain: string, email: string, token: string) => {
    // In a real app, validate the credentials here
    toast.success("Successfully connected to JIRA");
    setIsConnected(true);
  };

  const handleStartExport = async (config: ExportConfiguration) => {
    setIsExporting(true);
    setProgress({ current: 0, total: 100, status: "Starting export..." });

    // Simulate export progress
    let current = 0;
    const interval = setInterval(() => {
      current += 1;
      if (current <= 100) {
        setProgress({
          current,
          total: 100,
          status: `Exporting issue ${current} of 100...`,
        });
      } else {
        clearInterval(interval);
        setIsExporting(false);
        toast.success("Export completed successfully!");
      }
    }, 100);
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