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

// Updated mobile menu toggle with focus management
const oldToggle = `if (mobileMenuBtn && mobileMenu) {
                mobileMenuBtn.addEventListener("click", () => {
                    const isExpanded = mobileMenuBtn.getAttribute("aria-expanded") === "true";
                    mobileMenuBtn.setAttribute("aria-expanded", String(!isExpanded));
                    mobileMenu.classList.toggle("hidden");
                    mobileMenu.setAttribute("aria-hidden", String(isExpanded));
                });
            }`;

const newToggle = `if (mobileMenuBtn && mobileMenu) {
                mobileMenuBtn.addEventListener("click", () => {
                    const isExpanded = mobileMenuBtn.getAttribute("aria-expanded") === "true";
                    mobileMenuBtn.setAttribute("aria-expanded", String(!isExpanded));
                    mobileMenu.classList.toggle("hidden");
                    mobileMenu.setAttribute("aria-hidden", String(isExpanded));
                    if (!isExpanded) {
                        // Menu is now open: move focus to first focusable item
                        const firstFocusable = mobileMenu.querySelector("a, button, [tabindex]:not([tabindex='-1'])");
                        if (firstFocusable) firstFocusable.focus();
                    } else {
                        // Menu is now closed: restore focus to toggle button
                        mobileMenuBtn.focus();
                    }
                });
                // Close menu on Escape key when focus is inside menu
                mobileMenu.addEventListener("keydown", (e) => {
                    if (e.key === "Escape") {
                        mobileMenu.classList.add("hidden");
                        mobileMenu.setAttribute("aria-hidden", "true");
                        mobileMenuBtn.setAttribute("aria-expanded", "false");
                        mobileMenuBtn.focus();
                    }
                });
            }`;

function processFile(filePath) {
    let html = fs.readFileSync(filePath, "utf8");
    const original = html;

    if (html.includes(oldToggle)) {
        html = html.replace(oldToggle, newToggle);
        fs.writeFileSync(filePath, html, "utf8");
        console.log(`✓ Updated: ${filePath}`);
    } else {
        console.log(`⚠ Pattern not found: ${filePath}`);
    }
}

files.forEach(processFile);
console.log("\nDone!");
