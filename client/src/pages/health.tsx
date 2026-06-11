import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { RefreshCw } from "lucide-react";
import { format } from "date-fns";

export default function Health() {
  const { data: health, isLoading, refetch } = useQuery({
    queryKey: ["/api/v1/health"],
    queryFn: () => api.getHealth(),
    refetchInterval: 10000,
  });

  const handleRefresh = () => {
    refetch();
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-muted-foreground">Loading health data...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Health Check</h2>
            <p className="text-sm text-muted-foreground">Monitor API health and system status</p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRefresh}
            data-testid="button-refresh-health"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 space-y-6 overflow-auto">
        {/* Current Health Status */}
        <Card className="bg-card border border-border">
          <CardHeader>
            <CardTitle className="text-lg font-medium text-foreground">Current Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${
                    health?.status === "ok" ? "bg-green-500" : "bg-red-500"
                  }`}></div>
                  <span className="text-lg font-medium text-foreground">
                    {health?.status === "ok" ? "System Healthy" : "System Unhealthy"}
                  </span>
                </div>
                <span className="text-sm text-muted-foreground" data-testid="health-timestamp">
                  {health?.timestamp ? format(new Date(health.timestamp), "PPpp") : "N/A"}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">API Version</label>
                  <div className="p-2 bg-muted/30 rounded text-sm text-muted-foreground" data-testid="api-version">
                    {health?.version || "N/A"}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Environment</label>
                  <div className="p-2 bg-muted/30 rounded text-sm text-muted-foreground" data-testid="environment">
                    {health?.env || "N/A"}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Response Time</label>
                  <div className="p-2 bg-muted/30 rounded text-sm text-muted-foreground" data-testid="response-time">
                    {health?.responseTime || "N/A"}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Mock Adapters</label>
                  <div className="p-2 bg-muted/30 rounded text-sm text-muted-foreground" data-testid="mock-adapters">
                    {health?.flags?.useMockAdapters ? "Enabled" : "Disabled"}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Detailed Health Information */}
        <Card className="bg-card border border-border">
          <CardHeader>
            <CardTitle className="text-lg font-medium text-foreground">Detailed Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Raw Health Response</label>
                <pre className="bg-muted/30 p-4 rounded-lg text-sm text-muted-foreground overflow-auto font-mono">
                  {JSON.stringify(health, null, 2)}
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Health Check Actions */}
        <Card className="bg-card border border-border">
          <CardHeader>
            <CardTitle className="text-lg font-medium text-foreground">Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Button
                onClick={handleRefresh}
                className="w-full"
                data-testid="button-manual-health-check"
              >
                Run Manual Health Check
              </Button>
              <p className="text-xs text-muted-foreground">
                Health checks are automatically performed every 10 seconds. You can also trigger a manual check using the button above.
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
