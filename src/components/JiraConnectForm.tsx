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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!domain || !email || !token) {
      toast.error("Please fill in all fields");
      return;
    }
    onConnect(domain, email, token);
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
      <Button type="submit" className="w-full">
        Connect to JIRA
      </Button>
    </form>
  );
}