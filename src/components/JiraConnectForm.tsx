import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { toast } from "sonner";

interface JiraConnectFormProps {
  onConnect: (domain: string, email: string, token: string) => void;
}

export function JiraConnectForm({ onConnect }: JiraConnectFormProps) {
  const [domain, setDomain] = useState("");
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [isValidating, setIsValidating] = useState(false);

  const validateJiraCredentials = async (domain: string, email: string, token: string) => {
    try {
      // Clean up the domain URL to ensure proper formatting
      const cleanDomain = domain.replace(/\/+$/, '');
      
      // Test API call to JIRA's myself endpoint with CORS headers
      const response = await fetch(`${cleanDomain}/rest/api/2/myself`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${btoa(`${email}:${token}`)}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-Atlassian-Token': 'no-check'
        },
        mode: 'cors',
        credentials: 'include'
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Invalid credentials');
        } else if (response.status === 403) {
          throw new Error('Access forbidden - please check your JIRA permissions');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.emailAddress === email;
    } catch (error: any) {
      if (error.message.includes('CORS')) {
        toast.error(
          "CORS error detected. Please ensure CORS is enabled in your JIRA instance or use a CORS proxy.",
          { duration: 6000 }
        );
      }
      console.error('JIRA validation error:', error);
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!domain || !email || !token) {
      toast.error("Please fill in all fields");
      return;
    }

    // Basic domain format validation
    if (!domain.startsWith('http')) {
      toast.error("Domain should start with http:// or https://");
      return;
    }

    setIsValidating(true);
    
    try {
      const isValid = await validateJiraCredentials(domain, email, token);
      
      if (isValid) {
        toast.success("Successfully connected to JIRA");
        onConnect(domain, email, token);
      } else {
        toast.error(
          "Unable to connect to JIRA. Please check your credentials and ensure CORS is enabled.",
          { duration: 5000 }
        );
      }
    } catch (error) {
      toast.error("Failed to connect to JIRA. Please check your credentials and try again.");
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 w-full max-w-md">
      <div>
        <label htmlFor="domain" className="block text-sm font-medium mb-1">
          JIRA Domain
        </label>
        <Input
          id="domain"
          placeholder="https://your-domain.atlassian.net"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
        />
        <p className="text-xs text-gray-500 mt-1">
          Example: https://your-company.atlassian.net
        </p>
      </div>
      <div>
        <label htmlFor="email" className="block text-sm font-medium mb-1">
          Email
        </label>
        <Input
          id="email"
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div>
        <label htmlFor="token" className="block text-sm font-medium mb-1">
          API Token
        </label>
        <Input
          id="token"
          type="password"
          placeholder="Your JIRA API Token"
          value={token}
          onChange={(e) => setToken(e.target.value)}
        />
        <p className="text-xs text-gray-500 mt-1">
          Get your API token from{" "}
          <a
            href="https://id.atlassian.com/manage/api-tokens"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline"
          >
            Atlassian Account Settings
          </a>
        </p>
      </div>
      <Button type="submit" className="w-full" disabled={isValidating}>
        {isValidating ? "Validating..." : "Connect to JIRA"}
      </Button>
    </form>
  );
}