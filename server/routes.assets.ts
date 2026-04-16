import { Router } from "express";
import { storage } from "./storage";
import { insertAssetSchema } from "@shared/schema";
import { API_BASE } from "../shared/constants";

export function mountAssetRoutes(app: any, apiBase: string = API_BASE) {
  const router = Router();

  // List all assets for current user (with optional type filter)
  router.get("/", async (req, res) => {
    try {
      const type = req.query.type as string | undefined;
      const ownerUserId = "me"; // TODO: Get from authenticated user
      
      const assets = await storage.listAssets(ownerUserId, type);
      res.json(assets);
    } catch (error) {
      console.error("Error listing assets:", error);
      res.status(500).json({ error: "Failed to list assets" });
    }
  });

  // Get single asset
  router.get("/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const asset = await storage.getAsset(id);
      
      if (!asset) {
        return res.status(404).json({ error: "Asset not found" });
      }
      
      res.json(asset);
    } catch (error) {
      console.error("Error getting asset:", error);
      res.status(500).json({ error: "Failed to get asset" });
    }
  });

  // Create asset (without file upload for now)
  router.post("/", async (req, res) => {
    try {
      const validation = insertAssetSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({ 
          error: "Invalid asset data", 
          details: validation.error.errors 
        });
      }
      
      const asset = await storage.createAsset({
        ...validation.data,
        ownerUserId: "me" // TODO: Get from authenticated user
      });
      
      res.status(201).json(asset);
    } catch (error) {
      console.error("Error creating asset:", error);
      res.status(500).json({ error: "Failed to create asset" });
    }
  });

  // Delete asset
  router.delete("/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteAsset(id);
      
      if (!deleted) {
        return res.status(404).json({ error: "Asset not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting asset:", error);
      res.status(500).json({ error: "Failed to delete asset" });
    }
  });

  app.use(`${apiBase}/assets`, router);
}
