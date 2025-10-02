import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Dashboard from "@/pages/dashboard";
import Health from "@/pages/health";
import Adapters from "@/pages/adapters";
import Flags from "@/pages/flags";
import Tests from "@/pages/tests";
import Logs from "@/pages/logs";
import AdminConsole from "@/pages/AdminConsole";
import NotFound from "@/pages/not-found";
import Sidebar from "@/components/sidebar";

function Router() {
  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <Sidebar />
      <div className="flex-1">
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/health" component={Health} />
          <Route path="/adapters" component={Adapters} />
          <Route path="/flags" component={Flags} />
          <Route path="/tests" component={Tests} />
          <Route path="/logs" component={Logs} />
          <Route path="/admin" component={AdminConsole} />
          <Route component={NotFound} />
        </Switch>
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
