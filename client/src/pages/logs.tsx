import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api";
import { RefreshCw, Download } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";

export default function Logs() {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const { data: logs, isLoading, refetch } = useQuery({
    queryKey: ["/api/v1/logs"],
    queryFn: () => api.getLogs(100),
    refetchInterval: 5000,
  });

  const handleRefresh = () => {
    refetch();
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-muted-foreground">Loading logs...</div>
      </div>
    );
  }

  const filteredLogs = (logs || []).filter((log: any) => {
    const matchesFilter = filter === "all" || log.level.toLowerCase() === filter.toLowerCase();
    const matchesSearch = search === "" || 
      log.message.toLowerCase().includes(search.toLowerCase()) ||
      log.source.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const logLevels = ["ERROR", "WARN", "INFO", "DEBUG"];
  const logCounts = logLevels.reduce((acc, level) => {
    acc[level] = (logs || []).filter((log: any) => log.level === level).length;
    return acc;
  }, {} as Record<string, number>);

  const getLevelColor = (level: string) => {
    switch (level) {
      case "ERROR": return "text-red-400";
      case "WARN": return "text-yellow-400";
      case "INFO": return "text-green-400";
      case "DEBUG": return "text-blue-400";
      default: return "text-muted-foreground";
    }
  };

  const getLevelBadgeVariant = (level: string) => {
    switch (level) {
      case "ERROR": return "destructive";
      case "WARN": return "secondary";
      case "INFO": return "default";
      case "DEBUG": return "outline";
      default: return "outline";
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground">System Logs</h2>
            <p className="text-sm text-muted-foreground">Monitor application events and debugging information</p>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              size="sm"
              data-testid="button-download-logs"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleRefresh}
              data-testid="button-refresh-logs"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 space-y-6 overflow-auto">
        {/* Log Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {logLevels.map((level) => (
            <Card key={level} className="bg-card border border-border">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{level}</p>
                    <p className={`text-2xl font-bold ${getLevelColor(level)}`} data-testid={`log-count-${level.toLowerCase()}`}>
                      {logCounts[level]}
                    </p>
                  </div>
                  <Badge variant={getLevelBadgeVariant(level)}>
                    {level}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card className="bg-card border border-border">
          <CardHeader>
            <CardTitle className="text-lg font-medium text-foreground">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search logs..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  data-testid="input-search-logs"
                />
              </div>
              <div className="w-full md:w-48">
                <Select value={filter} onValueChange={setFilter}>
                  <SelectTrigger data-testid="select-log-level">
                    <SelectValue placeholder="Log level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="error">ERROR</SelectItem>
                    <SelectItem value="warn">WARN</SelectItem>
                    <SelectItem value="info">INFO</SelectItem>
                    <SelectItem value="debug">DEBUG</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Log Entries */}
        <Card className="bg-card border border-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-medium text-foreground">Log Entries</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Showing {filteredLogs.length} of {(logs || []).length} entries
                </p>
              </div>
              <Badge variant="outline">
                Auto-refresh: 5s
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {filteredLogs.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl text-muted-foreground">📝</span>
                </div>
                <p className="text-foreground font-medium mb-2">No logs found</p>
                <p className="text-sm text-muted-foreground">
                  {search || filter !== "all" 
                    ? "Try adjusting your search or filter criteria"
                    : "Logs will appear here as the system generates them"
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredLogs.map((log: any, index: number) => (
                  <div
                    key={index}
                    className="flex items-start space-x-3 p-3 bg-muted/30 rounded-lg font-mono text-sm"
                    data-testid={`log-entry-${index}`}
                  >
                    <span className="text-muted-foreground text-xs mt-0.5 min-w-0 flex-shrink-0">
                      {format(new Date(log.timestamp), "HH:mm:ss")}
                    </span>
                    <Badge 
                      variant={getLevelBadgeVariant(log.level)}
                      className="flex-shrink-0 text-xs"
                    >
                      {log.level}
                    </Badge>
                    <span className="text-muted-foreground flex-shrink-0 text-xs">
                      [{log.source}]
                    </span>
                    <span className="text-foreground flex-1 break-words">
                      {log.message}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Log Information */}
        <Card className="bg-card border border-border">
          <CardHeader>
            <CardTitle className="text-lg font-medium text-foreground">Log Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border border-border rounded-lg">
                  <h4 className="font-medium text-foreground mb-2">Log Levels</h4>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Badge variant="destructive">ERROR</Badge>
                      <span className="text-sm text-muted-foreground">Critical errors and failures</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary">WARN</Badge>
                      <span className="text-sm text-muted-foreground">Warnings and potential issues</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="default">INFO</Badge>
                      <span className="text-sm text-muted-foreground">General information</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">DEBUG</Badge>
                      <span className="text-sm text-muted-foreground">Debug and trace information</span>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 border border-border rounded-lg">
                  <h4 className="font-medium text-foreground mb-2">Log Sources</h4>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">• <code>server</code> - Express server events</p>
                    <p className="text-sm text-muted-foreground">• <code>adapter</code> - Adapter lifecycle events</p>
                    <p className="text-sm text-muted-foreground">• <code>test</code> - Test execution logs</p>
                    <p className="text-sm text-muted-foreground">• <code>config</code> - Configuration changes</p>
                  </div>
                </div>
              </div>
              
              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <p className="text-sm text-blue-400 font-medium mb-1">💡 Log Management</p>
                <p className="text-sm text-blue-300">
                  Logs are automatically refreshed every 5 seconds. Use the search and filter options to find specific events. 
                  In production, consider implementing log rotation and archival strategies.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
