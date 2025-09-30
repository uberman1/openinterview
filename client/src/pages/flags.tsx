import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { api } from "@/lib/api";

export default function Flags() {
  const { data: adapters, isLoading } = useQuery({
    queryKey: ["/api/v1/adapters"],
    queryFn: () => api.getAdapters(),
  });

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-muted-foreground">Loading feature flags...</div>
      </div>
    );
  }

  const flags = adapters?.flags || {};
  const adapterConfig = adapters?.adapters || {};

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Feature Flags</h2>
            <p className="text-sm text-muted-foreground">Configure system behavior and adapter selection</p>
          </div>
          <Badge variant="secondary">Read Only</Badge>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 space-y-6 overflow-auto">
        {/* System Flags */}
        <Card className="bg-card border border-border">
          <CardHeader>
            <CardTitle className="text-lg font-medium text-foreground">System Flags</CardTitle>
            <p className="text-sm text-muted-foreground">Core system behavior toggles</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="space-y-1">
                  <p className="font-medium text-foreground">Use Mock Adapters</p>
                  <p className="text-sm text-muted-foreground">
                    When enabled, the system uses mock implementations instead of real adapters
                  </p>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-muted-foreground">Key:</span>
                    <code className="text-xs bg-muted px-1 rounded">useMockAdapters</code>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Switch 
                    checked={flags.useMockAdapters} 
                    disabled
                    data-testid="switch-mock-adapters"
                  />
                  <Badge variant={flags.useMockAdapters ? "secondary" : "destructive"}>
                    {flags.useMockAdapters ? "ON" : "OFF"}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Adapter Configuration */}
        <Card className="bg-card border border-border">
          <CardHeader>
            <CardTitle className="text-lg font-medium text-foreground">Adapter Configuration</CardTitle>
            <p className="text-sm text-muted-foreground">Individual adapter implementation settings</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(adapterConfig).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div className="space-y-1">
                    <p className="font-medium text-foreground capitalize">{key} Adapter</p>
                    <p className="text-sm text-muted-foreground">
                      Current implementation: {value as string}
                    </p>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-muted-foreground">Key:</span>
                      <code className="text-xs bg-muted px-1 rounded">adapters.{key}</code>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      <span className="w-6 h-6">
                        {key === "auth" && "🔐"}
                        {key === "storage" && "💾"}
                        {key === "email" && "📧"}
                        {key === "payments" && "💳"}
                      </span>
                      <Badge 
                        variant={value === "mock" ? "secondary" : "default"}
                        data-testid={`flag-${key}-value`}
                      >
                        {value as string}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Raw Configuration */}
        <Card className="bg-card border border-border">
          <CardHeader>
            <CardTitle className="text-lg font-medium text-foreground">Raw Configuration</CardTitle>
            <p className="text-sm text-muted-foreground">Complete feature flag JSON configuration</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">flags.json</label>
                <pre className="bg-muted/30 p-4 rounded-lg text-sm text-muted-foreground overflow-auto font-mono">
                  {JSON.stringify({ 
                    useMockAdapters: flags.useMockAdapters,
                    adapters: adapterConfig 
                  }, null, 2)}
                </pre>
              </div>
              
              <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <p className="text-sm text-yellow-400 font-medium mb-1">⚠️ Configuration Note</p>
                <p className="text-sm text-yellow-300">
                  Feature flags are currently read-only in this interface. To modify flags, 
                  edit the <code className="bg-yellow-500/20 px-1 rounded">config/flags.json</code> file directly 
                  and restart the application.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Flag Management Guide */}
        <Card className="bg-card border border-border">
          <CardHeader>
            <CardTitle className="text-lg font-medium text-foreground">Flag Management</CardTitle>
            <p className="text-sm text-muted-foreground">How to work with feature flags</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border border-border rounded-lg">
                  <h4 className="font-medium text-foreground mb-2">Development Mode</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Use mock adapters for rapid development without external dependencies.
                  </p>
                  <code className="text-xs bg-muted px-2 py-1 rounded block">
                    "useMockAdapters": true
                  </code>
                </div>
                
                <div className="p-4 border border-border rounded-lg">
                  <h4 className="font-medium text-foreground mb-2">Production Mode</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Switch to real adapters when deploying to production environments.
                  </p>
                  <code className="text-xs bg-muted px-2 py-1 rounded block">
                    "useMockAdapters": false
                  </code>
                </div>
              </div>
              
              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <p className="text-sm text-blue-400 font-medium mb-1">💡 Best Practices</p>
                <ul className="text-sm text-blue-300 space-y-1">
                  <li>• Keep mock adapters enabled during development</li>
                  <li>• Test with real adapters before production deployment</li>
                  <li>• Use environment variables for flag overrides in different environments</li>
                  <li>• Document flag changes in your deployment process</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
