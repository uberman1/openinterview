import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";

export default function Adapters() {
  const { data: adapters, isLoading } = useQuery({
    queryKey: ["/api/v1/adapters"],
    queryFn: () => api.getAdapters(),
  });

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-muted-foreground">Loading adapter information...</div>
      </div>
    );
  }

  const adapterDetails = [
    {
      name: "Authentication",
      key: "auth",
      icon: "🔐",
      description: "Handles user authentication and authorization",
      methods: ["getUser", "login", "logout", "validateToken"]
    },
    {
      name: "Storage",
      key: "storage",
      icon: "💾",
      description: "Manages data persistence and retrieval",
      methods: ["save", "get", "delete", "list"]
    },
    {
      name: "Email",
      key: "email",
      icon: "📧",
      description: "Sends transactional and notification emails",
      methods: ["send", "sendBulk", "getTemplate", "validateEmail"]
    },
    {
      name: "Payments",
      key: "payments",
      icon: "💳",
      description: "Processes payments and manages billing",
      methods: ["createSession", "processPayment", "refund", "getStatus"]
    }
  ];

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Adapter Status</h2>
            <p className="text-sm text-muted-foreground">Manage and monitor adapter implementations</p>
          </div>
          <Badge variant={adapters?.mode === "mock" ? "secondary" : "default"}>
            {adapters?.mode === "mock" ? "Mock Mode" : "Production Mode"}
          </Badge>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 space-y-6 overflow-auto">
        {/* Adapter Overview */}
        <Card className="bg-card border border-border">
          <CardHeader>
            <CardTitle className="text-lg font-medium text-foreground">Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="font-medium text-foreground">Current Mode</p>
                  <p className="text-sm text-muted-foreground">
                    {adapters?.mode === "mock" 
                      ? "Using mock adapters for development" 
                      : "Using production adapters"}
                  </p>
                </div>
                <Badge variant={adapters?.mode === "mock" ? "secondary" : "default"}>
                  {adapters?.mode?.toUpperCase()}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="font-medium text-foreground">Mock Adapters Enabled</p>
                  <p className="text-sm text-muted-foreground">
                    Feature flag controlling adapter selection
                  </p>
                </div>
                <Badge variant={adapters?.flags?.useMockAdapters ? "secondary" : "destructive"}>
                  {adapters?.flags?.useMockAdapters ? "YES" : "NO"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Adapter Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {adapterDetails.map((adapter) => (
            <Card key={adapter.key} className="bg-card border border-border">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{adapter.icon}</span>
                  <div>
                    <CardTitle className="text-lg font-medium text-foreground">{adapter.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{adapter.description}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">Implementation</span>
                    <Badge 
                      variant={adapters?.adapters?.[adapter.key] === "mock" ? "secondary" : "default"}
                      data-testid={`adapter-${adapter.key}-status`}
                    >
                      {adapters?.adapters?.[adapter.key] || "unknown"}
                    </Badge>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-foreground mb-2">Available Methods</p>
                    <div className="flex flex-wrap gap-1">
                      {adapter.methods.map((method) => (
                        <span
                          key={method}
                          className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded"
                        >
                          {method}()
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Configuration */}
        <Card className="bg-card border border-border">
          <CardHeader>
            <CardTitle className="text-lg font-medium text-foreground">Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Feature Flags</label>
                <pre className="bg-muted/30 p-4 rounded-lg text-sm text-muted-foreground overflow-auto font-mono">
                  {JSON.stringify(adapters?.flags, null, 2)}
                </pre>
              </div>
              
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Adapter Configuration</label>
                <pre className="bg-muted/30 p-4 rounded-lg text-sm text-muted-foreground overflow-auto font-mono">
                  {JSON.stringify(adapters?.adapters, null, 2)}
                </pre>
              </div>
              
              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <p className="text-sm text-blue-400 font-medium mb-1">💡 Development Note</p>
                <p className="text-sm text-blue-300">
                  Mock adapters are currently active. To switch to production adapters, 
                  update the feature flags in <code className="bg-blue-500/20 px-1 rounded">config/flags.json</code> 
                  and implement the real adapter classes.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
