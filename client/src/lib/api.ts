import { apiRequest } from "./queryClient";

export interface SystemStatus {
  health: any;
  adapters: any;
  logs: any[];
  testResults: any[];
  flags: any;
}

export interface TestResult {
  passed: boolean;
  results: any[];
}

export const api = {
  getHealth: () => fetch("/api/v1/health").then(res => res.json()),
  getStatus: () => fetch("/api/v1/status").then(res => res.json()),
  getLogs: (limit?: number) => 
    fetch(`/api/v1/logs${limit ? `?limit=${limit}` : ""}`).then(res => res.json()),
  getAdapters: () => fetch("/api/v1/adapters").then(res => res.json()),
  runTests: () => apiRequest("POST", "/api/v1/test"),
};
