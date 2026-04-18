#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

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

    // 1. Add skip-to-content link as first child inside the first wrapper div after body
    if (!html.includes('href="#main-content"')) {
        html = html.replace(
            /<div class="relative flex min-h-screen w-full flex-col">/,
            `<div class="relative flex min-h-screen w-full flex-col">\n            <a href="#main-content" class="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-primary focus:text-white focus:rounded-lg focus:shadow-lg focus:outline-none">Skip to main content</a>`
        );
    }

    // 2. Add id="main-content" to <main> tag
    html = html.replace(
        /<main class="w-full">/,
        `<main id="main-content" class="w-full">`
    );

    // 3. Mobile menu button: add aria-expanded and aria-controls
    html = html.replace(
        /id="mobile-menu-btn"\s*\n(\s*)class="([^"]+)"\s*\n(\s*)aria-label="Toggle menu"/,
        (match, ws1, cls, ws2) =>
            `id="mobile-menu-btn"\n${ws1}class="${cls}"\n${ws2}aria-label="Toggle menu"\n${ws2}aria-expanded="false"\n${ws2}aria-controls="mobile-menu"`
    );

    // 4. Mobile menu div: add aria-hidden
    html = html.replace(
        /id="mobile-menu"\s*\n(\s*)class="hidden([^"]+)"/,
        (match, ws, rest) =>
            `id="mobile-menu"\n${ws}class="hidden${rest}"\n${ws}aria-hidden="true"`
    );

    // 5. Desktop nav: add aria-label
    html = html.replace(
        /<nav class="flex items-center gap-6">/,
        `<nav class="flex items-center gap-6" aria-label="Main navigation">`
    );

    // 6. Mobile nav inside mobile menu: add aria-label
    html = html.replace(
        /<nav class="flex flex-col p-4 gap-4">/,
        `<nav class="flex flex-col p-4 gap-4" aria-label="Mobile navigation">`
    );

    // 7. Hero section: add aria-label
    html = html.replace(
        /<section class="w-full bg-white dark:bg-neutral-950 py-14 md:py-20">/,
        `<section class="w-full bg-white dark:bg-neutral-950 py-14 md:py-20" aria-label="Introduction">`
    );

    // 8. Features section (Why OpenInterview?): add aria-label
    // This section has a specific class pattern
    html = html.replace(
        /<section\s*\n(\s*)class="w-full bg-neutral-50 dark:bg-neutral-900 py-12"\s*\n(\s*)>/,
        (match, ws1, ws2) =>
            `<section\n${ws1}class="w-full bg-neutral-50 dark:bg-neutral-900 py-12"\n${ws1}aria-label="Why OpenInterview"\n${ws2}>`
    );

    // 9. How it works section: add aria-label
    html = html.replace(
        /<section class="w-full bg-background-light dark:bg-background-dark pt-6 md:pt-12 pb-3 md:pb-6">/,
        `<section class="w-full bg-background-light dark:bg-background-dark pt-6 md:pt-12 pb-3 md:pb-6" aria-label="How it works">`
    );

    // 10. Feature cards section (3 cards)
    html = html.replace(
        /<section\s*\n(\s*)class="w-full bg-background-light dark:bg-background-dark py-6 md:py-12"\s*\n(\s*)>/,
        (match, ws1, ws2) =>
            `<section\n${ws1}class="w-full bg-background-light dark:bg-background-dark py-6 md:py-12"\n${ws1}aria-label="Feature highlights"\n${ws2}>`
    );

    // 11. Testimonials section: add aria-label
    html = html.replace(
        /<section\s*\n(\s*)class="w-full bg-white dark:bg-neutral-900 py-12 border-t border-neutral-100 dark:border-neutral-800"\s*\n(\s*)>/,
        (match, ws1, ws2) =>
            `<section\n${ws1}class="w-full bg-white dark:bg-neutral-900 py-12 border-t border-neutral-100 dark:border-neutral-800"\n${ws1}aria-label="Testimonials"\n${ws2}>`
    );

    // 12. CTA section: add aria-label
    html = html.replace(
        /<section id="more-than-paper"\s*\n(\s*)class="([^"]+)"\s*\n(\s*)>/,
        (match, ws1, cls, ws2) =>
            `<section id="more-than-paper"\n${ws1}class="${cls}"\n${ws1}aria-label="Get started"\n${ws2}>`
    );

    // 13. Carousel: add role and aria-label
    html = html.replace(
        /id="home-resume-carousel"\s*\n(\s*)class="([^"]+)"/,
        (match, ws, cls) =>
            `id="home-resume-carousel"\n${ws}class="${cls}"\n${ws}role="region"\n${ws}aria-label="Sample OpenInterview profiles"\n${ws}aria-roledescription="carousel"`
    );

    // 14. Decorative animation button in "How it works": aria-hidden + tabindex
    html = html.replace(
        /<button\s*\n(\s*)class="px-5 py-2 bg-primary text-white rounded-lg shadow-sm flex items-center gap-2 animate-button-press"\s*\n(\s*)>/,
        (match, ws1, ws2) =>
            `<button\n${ws1}class="px-5 py-2 bg-primary text-white rounded-lg shadow-sm flex items-center gap-2 animate-button-press"\n${ws1}aria-hidden="true"\n${ws1}tabindex="-1"\n${ws2}>`
    );

    // 15. Footer: add role="contentinfo" if missing
    html = html.replace(
        /<footer\s*\n(\s*)class="border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 pt-16 pb-16"\s*\n(\s*)>/,
        (match, ws1, ws2) =>
            `<footer\n${ws1}class="border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 pt-16 pb-16"\n${ws1}role="contentinfo"\n${ws2}>`
    );

    // 16. Update mobile menu JS toggle to also manage aria attributes
    html = html.replace(
        /if \(mobileMenuBtn && mobileMenu\) \{\s*\n(\s*)mobileMenuBtn\.addEventListener\("click", \(\) => \{\s*\n(\s*)mobileMenu\.classList\.toggle\("hidden"\);\s*\n(\s*)\}\);\s*\n(\s*)\}/,
        (match, ws1, ws2, ws3, ws4) =>
            `if (mobileMenuBtn && mobileMenu) {\n${ws1}mobileMenuBtn.addEventListener("click", () => {\n${ws2}const isExpanded = mobileMenuBtn.getAttribute("aria-expanded") === "true";\n${ws2}mobileMenuBtn.setAttribute("aria-expanded", String(!isExpanded));\n${ws2}mobileMenu.classList.toggle("hidden");\n${ws2}mobileMenu.setAttribute("aria-hidden", String(isExpanded));\n${ws3}});\n${ws4}}`
    );

    if (html !== original) {
        fs.writeFileSync(filePath, html, "utf8");
        console.log(`✓ Updated: ${filePath}`);
    } else {
        console.log(`⚠ No changes: ${filePath}`);
    }
}

files.forEach(processFile);
console.log("\nDone!");
