import { type User, type InsertUser, type HealthCheck, type InsertHealthCheck, type Log, type InsertLog, type TestResult, type InsertTestResult } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Health check methods
  getLatestHealthCheck(): Promise<HealthCheck | undefined>;
  createHealthCheck(healthCheck: InsertHealthCheck): Promise<HealthCheck>;
  getHealthCheckHistory(limit?: number): Promise<HealthCheck[]>;
  
  // Log methods
  createLog(log: InsertLog): Promise<Log>;
  getRecentLogs(limit?: number): Promise<Log[]>;
  
  // Test result methods
  createTestResult(testResult: InsertTestResult): Promise<TestResult>;
  getLatestTestResults(limit?: number): Promise<TestResult[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private healthChecks: Map<string, HealthCheck>;
  private logs: Map<string, Log>;
  private testResults: Map<string, TestResult>;

  constructor() {
    this.users = new Map();
    this.healthChecks = new Map();
    this.logs = new Map();
    this.testResults = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id, roles: ['user'] };
    this.users.set(id, user);
    return user;
  }

  async getLatestHealthCheck(): Promise<HealthCheck | undefined> {
    const checks = Array.from(this.healthChecks.values())
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return checks[0];
  }

  async createHealthCheck(insertHealthCheck: InsertHealthCheck): Promise<HealthCheck> {
    const id = randomUUID();
    const healthCheck: HealthCheck = {
      id,
      timestamp: new Date(),
      status: insertHealthCheck.status,
      responseTime: insertHealthCheck.responseTime ?? null,
      environment: insertHealthCheck.environment ?? null,
      adapters: insertHealthCheck.adapters ?? null,
      flags: insertHealthCheck.flags ?? null,
    };
    this.healthChecks.set(id, healthCheck);
    return healthCheck;
  }

  async getHealthCheckHistory(limit = 10): Promise<HealthCheck[]> {
    return Array.from(this.healthChecks.values())
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  async createLog(insertLog: InsertLog): Promise<Log> {
    const id = randomUUID();
    const log: Log = {
      ...insertLog,
      id,
      timestamp: new Date(),
    };
    this.logs.set(id, log);
    return log;
  }

  async getRecentLogs(limit = 20): Promise<Log[]> {
    return Array.from(this.logs.values())
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  async createTestResult(insertTestResult: InsertTestResult): Promise<TestResult> {
    const id = randomUUID();
    const testResult: TestResult = {
      id,
      timestamp: new Date(),
      name: insertTestResult.name,
      status: insertTestResult.status,
      duration: insertTestResult.duration ?? null,
      details: insertTestResult.details ?? null,
    };
    this.testResults.set(id, testResult);
    return testResult;
  }

  async getLatestTestResults(limit = 10): Promise<TestResult[]> {
    return Array.from(this.testResults.values())
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }
}

export const storage = new MemStorage();
