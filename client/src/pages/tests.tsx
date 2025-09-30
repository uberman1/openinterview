import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { Play, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export default function Tests() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: status, isLoading } = useQuery({
    queryKey: ["/api/v1/status"],
    queryFn: () => api.getStatus(),
  });

  const runTestsMutation = useMutation({
    mutationFn: () => api.runTests(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/status"] });
      toast({
        title: "Tests completed",
        description: "Test suite has finished running",
      });
    },
    onError: () => {
      toast({
        title: "Test failed",
        description: "Failed to run test suite",
        variant: "destructive",
      });
    },
  });

  const handleRunTests = () => {
    runTestsMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-muted-foreground">Loading test results...</div>
      </div>
    );
  }

  const testResults = status?.testResults || [];
  const passedTests = testResults.filter((t: any) => t.status === "passed").length;
  const failedTests = testResults.filter((t: any) => t.status === "failed").length;

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Self Tests</h2>
            <p className="text-sm text-muted-foreground">Automated test suite and results</p>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/v1/status"] })}
              disabled={runTestsMutation.isPending}
              data-testid="button-refresh-tests"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={handleRunTests}
              disabled={runTestsMutation.isPending}
              data-testid="button-run-tests"
            >
              <Play className="h-4 w-4 mr-2" />
              {runTestsMutation.isPending ? "Running..." : "Run Tests"}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 space-y-6 overflow-auto">
        {/* Test Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-card border border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Tests</p>
                  <p className="text-2xl font-bold text-foreground" data-testid="total-tests">
                    {testResults.length}
                  </p>
                </div>
                <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center">
                  <span className="text-blue-400">🧪</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Passed</p>
                  <p className="text-2xl font-bold text-green-400" data-testid="passed-tests">
                    {passedTests}
                  </p>
                </div>
                <div className="w-8 h-8 bg-green-500/10 rounded-lg flex items-center justify-center">
                  <span className="text-green-400">✓</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Failed</p>
                  <p className="text-2xl font-bold text-red-400" data-testid="failed-tests">
                    {failedTests}
                  </p>
                </div>
                <div className="w-8 h-8 bg-red-500/10 rounded-lg flex items-center justify-center">
                  <span className="text-red-400">✗</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Success Rate</p>
                  <p className="text-2xl font-bold text-foreground" data-testid="success-rate">
                    {testResults.length > 0 ? Math.round((passedTests / testResults.length) * 100) : 0}%
                  </p>
                </div>
                <div className="w-8 h-8 bg-purple-500/10 rounded-lg flex items-center justify-center">
                  <span className="text-purple-400">📊</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Test Results */}
        <Card className="bg-card border border-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-medium text-foreground">Test Results</CardTitle>
                <p className="text-sm text-muted-foreground">Individual test case results</p>
              </div>
              {testResults.length > 0 && (
                <Badge variant={passedTests === testResults.length ? "default" : "destructive"}>
                  {passedTests}/{testResults.length} PASSED
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {testResults.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl text-muted-foreground">🧪</span>
                </div>
                <p className="text-foreground font-medium mb-2">No tests have been run yet</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Click the "Run Tests" button to execute the test suite
                </p>
                <Button onClick={handleRunTests} disabled={runTestsMutation.isPending}>
                  <Play className="h-4 w-4 mr-2" />
                  Run Tests
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {testResults.map((test: any, index: number) => (
                  <div
                    key={index}
                    className="flex items-start justify-between p-4 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-start space-x-3 flex-1">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center mt-0.5 ${
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
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <p className="text-sm font-medium text-foreground" data-testid={`test-${test.name}`}>
                            {test.name}
                          </p>
                          <Badge variant={test.status === "passed" ? "default" : "destructive"}>
                            {test.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">
                          {test.name === "api.health" ? "Health endpoint returns valid response" :
                           test.name === "client.build" ? "Client builds successfully without errors" :
                           "Test description"}
                        </p>
                        {test.details && Object.keys(test.details).length > 0 && (
                          <pre className="text-xs bg-muted/50 p-2 rounded mt-2 text-muted-foreground">
                            {JSON.stringify(test.details, null, 2)}
                          </pre>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          Executed: {format(new Date(test.timestamp), "PPpp")}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-muted-foreground">{test.duration}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Test Information */}
        <Card className="bg-card border border-border">
          <CardHeader>
            <CardTitle className="text-lg font-medium text-foreground">Test Suite Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border border-border rounded-lg">
                  <h4 className="font-medium text-foreground mb-2">API Health Test</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Verifies that the health endpoint is accessible and returns the expected response format.
                  </p>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Endpoint: <code>/api/v1/health</code></p>
                    <p className="text-xs text-muted-foreground">Expected: Status 200, valid JSON</p>
                  </div>
                </div>
                
                <div className="p-4 border border-border rounded-lg">
                  <h4 className="font-medium text-foreground mb-2">Client Build Test</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Ensures the client application builds successfully without errors.
                  </p>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Command: <code>npm run build</code></p>
                    <p className="text-xs text-muted-foreground">Expected: Exit code 0</p>
                  </div>
                </div>
              </div>
              
              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <p className="text-sm text-blue-400 font-medium mb-1">💡 About Self-Tests</p>
                <p className="text-sm text-blue-300">
                  The self-test suite validates core functionality to ensure the system is working correctly. 
                  Tests are designed to run quickly and verify essential components without external dependencies.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
