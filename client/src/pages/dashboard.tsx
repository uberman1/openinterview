import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import StatusCard from "@/components/status-card";
import { api } from "@/lib/api";
import { RefreshCw, Play } from "lucide-react";
import { format } from "date-fns";

export default function Dashboard() {
  const { data: status, isLoading, refetch } = useQuery({
    queryKey: ["/api/v1/status"],
    queryFn: () => api.getStatus(),
    refetchInterval: 30000,
  });

  const handleRefresh = () => {
    refetch();
  };

  const handleRunTests = async () => {
    try {
      await api.runTests();
      refetch();
    } catch (error) {
      console.error("Failed to run tests:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const passedTests = status?.testResults?.filter((t: any) => t.status === "passed").length || 0;
  const totalTests = status?.testResults?.length || 0;

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground">System Overview</h2>
            <p className="text-sm text-muted-foreground">Monitor your OpenInterview development environment</p>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleRefresh}
              data-testid="button-refresh"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={handleRunTests}
              data-testid="button-run-tests"
            >
              <Play className="h-4 w-4 mr-2" />
              Run Tests
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 space-y-6 overflow-auto">
        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatusCard
            title="API Status"
            value={status?.health?.status === "ok" ? "Online" : "Offline"}
            icon="✓"
            description={`Port 5000 • ${status?.health?.responseTime || "N/A"}`}
            variant={status?.health?.status === "ok" ? "success" : "error"}
          />
          <StatusCard
            title="Client Status"
            value="Ready"
            icon="✓"
            description="Port 5173 • Vite HMR"
            variant="success"
          />
          <StatusCard
            title="Adapters"
            value="4 Mock"
            icon="🔌"
            description="Auth, Storage, Email, Payments"
            variant="info"
          />
          <StatusCard
            title="Last Test"
            value={totalTests > 0 && passedTests === totalTests ? "Passed" : "Failed"}
            icon="🧪"
            description={totalTests > 0 ? `${passedTests}/${totalTests} tests` : "No tests run"}
            variant={totalTests > 0 && passedTests === totalTests ? "success" : "warning"}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Health Check */}
          <Card className="bg-card border border-border">
            <CardHeader>
              <CardTitle className="text-lg font-medium text-foreground">Health Check</CardTitle>
              <p className="text-sm text-muted-foreground">Real-time API health monitoring</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-foreground">API Endpoint</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-green-400">
                      {status?.health?.status === "ok" ? "Healthy" : "Unhealthy"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-foreground">Response Time</span>
                  <span className="text-sm text-muted-foreground" data-testid="response-time">
                    {status?.health?.responseTime || "N/A"}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-foreground">Environment</span>
                  <span className="text-sm bg-yellow-500/10 text-yellow-400 px-2 py-1 rounded text-xs">
                    {status?.health?.env || "development"}
                  </span>
                </div>
              </div>
              <Button
                variant="secondary"
                className="w-full mt-4"
                onClick={handleRefresh}
                data-testid="button-health-check"
              >
                Run Health Check
              </Button>
            </CardContent>
          </Card>

          {/* Adapter Status */}
          <Card className="bg-card border border-border">
            <CardHeader>
              <CardTitle className="text-lg font-medium text-foreground">Adapter Status</CardTitle>
              <p className="text-sm text-muted-foreground">Current adapter implementations</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(status?.flags?.adapters || {}).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between py-2 border-b border-border last:border-b-0">
                    <div className="flex items-center space-x-3">
                      <span className="w-6 h-6">
                        {key === "auth" && "🔐"}
                        {key === "storage" && "💾"}
                        {key === "email" && "📧"}
                        {key === "payments" && "💳"}
                      </span>
                      <span className="text-sm text-foreground capitalize">{key}</span>
                    </div>
                    <span className="text-xs bg-blue-500/10 text-blue-400 px-2 py-1 rounded">
                      {value as string}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Logs */}
        <Card className="bg-card border border-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-medium text-foreground">Recent Activity</CardTitle>
                <p className="text-sm text-muted-foreground">Latest system logs and events</p>
              </div>
              <Button variant="link" className="text-primary hover:text-primary/80 text-sm font-medium p-0">
                View All →
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 font-mono text-sm">
              {status?.logs?.slice(0, 4).map((log: any, index: number) => (
                <div key={index} className="flex items-start space-x-3 py-2">
                  <span className="text-muted-foreground text-xs mt-0.5 min-w-0 flex-shrink-0">
                    {format(new Date(log.timestamp), "HH:mm:ss")}
                  </span>
                  <span className={`flex-shrink-0 ${
                    log.level === "ERROR" ? "text-red-400" :
                    log.level === "WARN" ? "text-yellow-400" :
                    log.level === "INFO" ? "text-green-400" : "text-blue-400"
                  }`}>
                    {log.level}
                  </span>
                  <span className="text-foreground">[{log.source}] {log.message}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Test Results */}
        <Card className="bg-card border border-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-medium text-foreground">Self-Test Results</CardTitle>
                <p className="text-sm text-muted-foreground">Automated test suite status</p>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`text-xs px-2 py-1 rounded ${
                  totalTests > 0 && passedTests === totalTests
                    ? "bg-green-500/10 text-green-400"
                    : "bg-red-500/10 text-red-400"
                }`}>
                  {totalTests > 0 ? `${passedTests}/${totalTests} PASSED` : "NO TESTS"}
                </span>
                <Button size="sm" onClick={handleRunTests} data-testid="button-run-tests-card">
                  Run Tests
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {status?.testResults?.slice(0, 3).map((test: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
                  <div className="flex items-center space-x-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      test.status === "passed" 
                        ? "bg-green-500/10" 
                        : "bg-red-500/10"
                    }`}>
                      <span className={`text-sm ${
                        test.status === "passed" 
                          ? "text-green-400" 
                          : "text-red-400"
                      }`}>
                        {test.status === "passed" ? "✓" : "✗"}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{test.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {test.name === "api.health" ? "Health endpoint returns valid response" :
                         test.name === "client.build" ? "Client builds successfully without errors" :
                         "Test description"}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">{test.duration}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="bg-card border border-border">
          <CardHeader>
            <CardTitle className="text-lg font-medium text-foreground">Quick Actions</CardTitle>
            <p className="text-sm text-muted-foreground">Common development tasks</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                className="flex flex-col items-center p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors group"
                data-testid="button-setup"
              >
                <span className="text-2xl mb-2">📦</span>
                <span className="text-sm font-medium text-foreground group-hover:text-accent-foreground">Setup Project</span>
                <span className="text-xs text-muted-foreground text-center mt-1">Install dependencies</span>
              </button>
              
              <button
                className="flex flex-col items-center p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors group"
                data-testid="button-dev-server"
              >
                <span className="text-2xl mb-2">🚀</span>
                <span className="text-sm font-medium text-foreground group-hover:text-accent-foreground">Start Dev Server</span>
                <span className="text-xs text-muted-foreground text-center mt-1">API + Client with proxy</span>
              </button>
              
              <button
                className="flex flex-col items-center p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors group"
                data-testid="button-docs"
              >
                <span className="text-2xl mb-2">📚</span>
                <span className="text-sm font-medium text-foreground group-hover:text-accent-foreground">Documentation</span>
                <span className="text-xs text-muted-foreground text-center mt-1">View README & guides</span>
              </button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
