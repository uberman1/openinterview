import "dotenv/config";
import { v2 as cloudinary } from "cloudinary";
import fs from "node:fs/promises";

function assertEnv(key) {
  if (!process.env[key]) throw new Error(`Missing required env var: ${key}`);
}

const PREFIX = process.env.CLOUDINARY_PREFIX ?? "openinterview/";
const TYPE = process.env.CLOUDINARY_TYPE ?? "upload"; // usually "upload"
const SAVE_JSON = (process.env.SAVE_JSON ?? "true").toLowerCase() === "true";
const OUTPUT_FILE = process.env.OUTPUT_FILE ?? "cloudinary_assets_dump.json";

// Safety gate: set DELETE_ALL=true to actually delete
const DELETE_ALL = (process.env.DELETE_ALL ?? "false").toLowerCase() === "true";

const RESOURCE_TYPES = ["image", "video", "raw"]; // your use-case

async function listAllByResourceType(resource_type) {
  let next_cursor = undefined;
  const all = [];

  while (true) {
    const res = await cloudinary.api.resources({
      resource_type,
      type: TYPE,
      prefix: PREFIX,
      max_results: 500,
      next_cursor,
    });

    const resources = res?.resources ?? [];
    for (const r of resources) {
      all.push({
        resource_type,
        public_id: r.public_id,
        format: r.format ?? null,
        bytes: r.bytes ?? null,
        created_at: r.created_at ?? null,
        secure_url: r.secure_url ?? null,
      });
    }

    if (!res?.next_cursor) break;
    next_cursor = res.next_cursor;
  }

  return all;
}

async function deleteInBatches(resource_type, publicIds) {
  const BATCH = 100; // Cloudinary bulk delete limit
  let deleted = 0;
  let notFound = 0;
  let other = 0;

  for (let i = 0; i < publicIds.length; i += BATCH) {
    const chunk = publicIds.slice(i, i + BATCH);

    const res = await cloudinary.api.delete_resources(chunk, {
      resource_type,
      type: TYPE,
      invalidate: true,
    });

    const deletedMap = res?.deleted ?? {};
    const values = Object.values(deletedMap);

    const chunkDeleted = values.filter((v) => v === "deleted").length;
    const chunkNotFound = values.filter((v) => v === "not_found").length;
    const chunkOther = values.length - chunkDeleted - chunkNotFound;

    deleted += chunkDeleted;
    notFound += chunkNotFound;
    other += chunkOther;

    console.log(
      `[DELETE] resource_type=${resource_type} batch=${Math.floor(i / BATCH) + 1} ` +
        `requested=${chunk.length} deleted=${chunkDeleted} not_found=${chunkNotFound} other=${chunkOther}`
    );

    // Optional: print any non-standard statuses (rare but useful)
    if (chunkOther > 0) {
      for (const [pid, status] of Object.entries(deletedMap)) {
        if (status !== "deleted" && status !== "not_found") {
          console.log(`        - ${pid}: ${status}`);
        }
      }
    }
  }

  return { deleted, notFound, other };
}

async function main() {
  assertEnv("CLOUDINARY_CLOUD_NAME");
  assertEnv("CLOUDINARY_API_KEY");
  assertEnv("CLOUDINARY_API_SECRET");

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });

  console.log("================================================");
  console.log("CLOUDINARY LIST + DELETE (by prefix)");
  console.log("CLOUD :", process.env.CLOUDINARY_CLOUD_NAME);
  console.log("TYPE  :", TYPE);
  console.log("PREFIX:", PREFIX);
  console.log("DELETE_ALL:", DELETE_ALL);
  console.log("================================================\n");

  const all = [];
  for (const rt of RESOURCE_TYPES) {
    console.log(`[LIST] resource_type=${rt} prefix=${PREFIX}`);
    const items = await listAllByResourceType(rt);
    console.log(`       found=${items.length}\n`);
    all.push(...items);
  }

  const byType = {
    image: all.filter((x) => x.resource_type === "image"),
    video: all.filter((x) => x.resource_type === "video"),
    raw: all.filter((x) => x.resource_type === "raw"),
  };

  const total = all.length;

  console.log("================================================");
  console.log("SUMMARY (FOUND)");
  console.log("image:", byType.image.length);
  console.log("video:", byType.video.length);
  console.log("raw  :", byType.raw.length);
  console.log("TOTAL:", total);
  console.log("================================================\n");

  const preview = all.slice(0, 15).map((x) => `${x.resource_type}: ${x.public_id}`);
  if (preview.length) {
    console.log("Preview (first 15):");
    for (const line of preview) console.log(" -", line);
    console.log("");
  }

  if (SAVE_JSON) {
    await fs.writeFile(
      OUTPUT_FILE,
      JSON.stringify({ prefix: PREFIX, type: TYPE, total, assets: all }, null, 2)
    );
    console.log(`[SAVE] Wrote ${total} assets to ${OUTPUT_FILE}\n`);
  }

  if (!DELETE_ALL) {
    console.log(
      "Deletion is disabled.\n" +
        "To delete everything listed above, run with:\n" +
        "DELETE_ALL=true node cleaningcloudinaryfiles.mjs\n"
    );
    return;
  }

  if (total === 0) {
    console.log("Nothing to delete (no assets found for this prefix).");
    return;
  }

  console.log("================================================");
  console.log("DELETING…");
  console.log("================================================\n");

  const img = await deleteInBatches("image", byType.image.map((x) => x.public_id));
  const vid = await deleteInBatches("video", byType.video.map((x) => x.public_id));
  const raw = await deleteInBatches("raw", byType.raw.map((x) => x.public_id));

  console.log("\n================================================");
  console.log("DELETE SUMMARY");
  console.log(`image: deleted=${img.deleted}/${byType.image.length} not_found=${img.notFound} other=${img.other}`);
  console.log(`video: deleted=${vid.deleted}/${byType.video.length} not_found=${vid.notFound} other=${vid.other}`);
  console.log(`raw  : deleted=${raw.deleted}/${byType.raw.length} not_found=${raw.notFound} other=${raw.other}`);
  console.log("TOTAL deleted:", img.deleted + vid.deleted + raw.deleted, "/", total);
  console.log("================================================");
}

main().catch((e) => {
  console.error("FATAL:", e?.message ?? e);
  process.exit(1);
});

//it wil deelet all fiels over cloudinary
//to dlete uploaded files run:DELETE_ALL=true node cleaningcloudinaryfiles.mjs
