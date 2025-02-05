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
      // Test API call to JIRA's myself endpoint which is commonly used for validation
      const response = await fetch(`${domain}/rest/api/2/myself`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${btoa(`${email}:${token}`)}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Invalid credentials');
      }

      const data = await response.json();
      return data.emailAddress === email; // Additional validation checking if returned email matches
    } catch (error) {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!domain || !email || !token) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsValidating(true);
    
    try {
      const isValid = await validateJiraCredentials(domain, email, token);
      
      if (isValid) {
        toast.success("Successfully connected to JIRA");
        onConnect(domain, email, token);
      } else {
        toast.error("Invalid JIRA credentials. Please check your domain, email, and API token.");
      }
    } catch (error) {
      toast.error("Failed to connect to JIRA. Please check your credentials.");
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
      </div>
      <Button type="submit" className="w-full" disabled={isValidating}>
        {isValidating ? "Validating..." : "Connect to JIRA"}
      </Button>
    </form>
  );
}