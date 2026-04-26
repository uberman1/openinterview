#!/usr/bin/env node

const fs = require("fs");

const files = [
    "public/caregivers.html",
    "public/conventions.html",
    "public/creators.html",
    "public/events.html",
    "public/freelancers.html",
    "public/musicians.html",
    "public/performers.html",
    "public/sales.html",
    "public/services.html",
    "public/startups.html",
    "public/for-tutors.html",
];

function processFile(filePath) {
    let html = fs.readFileSync(filePath, "utf8");
    const original = html;

    // Fix duplicate aria-expanded + aria-controls on mobile menu button
    // Pattern: appears twice consecutively
    html = html.replace(
        /([ \t]+aria-expanded="false"\n[ \t]+aria-controls="mobile-menu"\n)([ \t]+aria-expanded="false"\n[ \t]+aria-controls="mobile-menu"\n)/g,
        "$1"
    );

    // Fix duplicate role + aria-label + aria-roledescription on carousel
    html = html.replace(
        /([ \t]+role="region"\n[ \t]+aria-label="Sample OpenInterview profiles"\n[ \t]+aria-roledescription="carousel"\n)([ \t]+role="region"\n[ \t]+aria-label="Sample OpenInterview profiles"\n[ \t]+aria-roledescription="carousel"\n)/g,
        "$1"
    );

    if (html !== original) {
        fs.writeFileSync(filePath, html, "utf8");
        console.log(`✓ Fixed: ${filePath}`);
    } else {
        console.log(`⚠ No duplicates found: ${filePath}`);
    }
}

files.forEach(processFile);
console.log("\nDone!");
