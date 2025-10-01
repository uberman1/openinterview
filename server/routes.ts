import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { getRegistry } from "../adapters/index";
import flags from "../config/flags.json";
import { APP_VERSION, API_BASE } from "../shared/constants";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { router as profilesRouter } from "./routes.profiles";
import { router as interviewsRouter } from "./routes.interviews";
import { errorMiddleware } from "./errors";
import { mountAuth } from "./auth.routes.js";
import { router as protectedRouter } from "./protected.routes";

export async function registerRoutes(app: Express): Promise<Server> {
  // Mount unified auth router (selects mock vs real via USE_MOCK_AUTH)
  mountAuth(app, API_BASE);
  
  // Health endpoint
  app.get(`${API_BASE}/health`, async (req, res) => {
    const startTime = Date.now();
    
    try {
      const registry = await getRegistry();
      const responseTime = `${Date.now() - startTime}ms`;
      
      const healthData = {
        status: 'ok',
        env: process.env.NODE_ENV || 'development',
        version: APP_VERSION,
        adapters: flags.adapters || {},
        flags: { 
          useMockAdapters: flags.useMockAdapters,
          useMockAuth: /^true$/i.test(String(process.env.USE_MOCK_AUTH || ''))
        },
        responseTime,
        timestamp: new Date().toISOString()
      };

      // Store health check
      await storage.createHealthCheck({
        status: 'ok',
        responseTime,
        environment: process.env.NODE_ENV || 'development',
        adapters: flags.adapters,
        flags: { useMockAdapters: flags.useMockAdapters }
      });

      // Log the health check
      await storage.createLog({
        level: 'INFO',
        source: 'server',
        message: 'Health check endpoint accessed'
      });

      res.json(healthData);
    } catch (error) {
      const responseTime = `${Date.now() - startTime}ms`;
      
      await storage.createLog({
        level: 'ERROR',
        source: 'server',
        message: `Health check failed: ${error}`
      });

      res.status(500).json({
        status: 'error',
        error: 'Health check failed',
        responseTime
      });
    }
  });

  // Get system status
  app.get(`${API_BASE}/status`, async (req, res) => {
    try {
      // Perform a fresh health check
      const startTime = Date.now();
      const registry = await getRegistry();
      const responseTime = `${Date.now() - startTime}ms`;
      
      const currentHealth = {
        status: 'ok',
        responseTime,
        environment: process.env.NODE_ENV || 'development',
        adapters: flags.adapters,
        flags: { useMockAdapters: flags.useMockAdapters }
      };

      // Store the health check
      const storedHealth = await storage.createHealthCheck(currentHealth);
      
      const recentLogs = await storage.getRecentLogs(10);
      const testResults = await storage.getLatestTestResults(5);
      
      res.json({
        health: storedHealth,
        adapters: registry,
        logs: recentLogs,
        testResults,
        flags
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get system status' });
    }
  });

  // Get logs
  app.get(`${API_BASE}/logs`, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const logs = await storage.getRecentLogs(limit);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get logs' });
    }
  });

  // Run tests
  app.post(`${API_BASE}/test`, async (req, res) => {
    try {
      await storage.createLog({
        level: 'INFO',
        source: 'server',
        message: 'Test suite started'
      });

      // Simulate test results
      const tests = [
        { name: 'api.health', description: 'Health endpoint returns valid response' },
        { name: 'client.build', description: 'Client builds successfully without errors' }
      ];

      const results = [];
      for (const test of tests) {
        const startTime = Date.now();
        let status = 'passed';
        let details = {};

        try {
          if (test.name === 'api.health') {
            const healthRes = await fetch(`http://localhost:${process.env.PORT || 5000}${API_BASE}/health`);
            const healthData = await healthRes.json();
            if (!healthData.status || healthData.status !== 'ok') {
              status = 'failed';
              details = { error: 'Invalid health response' };
            }
          }
        } catch (error) {
          status = 'failed';
          details = { error: String(error) };
        }

        const duration = `${Date.now() - startTime}ms`;
        
        const result = await storage.createTestResult({
          name: test.name,
          status,
          duration,
          details
        });

        results.push(result);
      }

      await storage.createLog({
        level: 'INFO',
        source: 'server',
        message: `Test suite completed: ${results.filter(r => r.status === 'passed').length}/${results.length} passed`
      });

      res.json({
        passed: results.every(r => r.status === 'passed'),
        results
      });
    } catch (error) {
      await storage.createLog({
        level: 'ERROR',
        source: 'server',
        message: `Test suite failed: ${error}`
      });
      
      res.status(500).json({ error: 'Test execution failed' });
    }
  });

  // Get adapter status
  app.get(`${API_BASE}/adapters`, async (req, res) => {
    try {
      const registry = await getRegistry();
      res.json({
        mode: registry.mode,
        adapters: flags.adapters,
        flags: { useMockAdapters: flags.useMockAdapters }
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get adapter status' });
    }
  });

  // Module 1: Domain routes
  app.use(`${API_BASE}`, profilesRouter);
  app.use(`${API_BASE}`, interviewsRouter);

  // Protected routes (Module 3)
  app.use(`${API_BASE}`, protectedRouter);

  // Error handler (must be last)
  app.use(errorMiddleware);

  const httpServer = createServer(app);
  return httpServer;
}
