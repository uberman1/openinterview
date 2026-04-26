#!/usr/bin/env node
// One-off string-rewrite utility that applies ARIA/keyboard improvements to
// public/home.html and public/pricing.html. This script uses literal string
// matching against specific markup patterns; re-running it is safe (guards
// check for already-applied changes) but it may need updating if the markup
// structure changes significantly.

const fs = require("fs");

function processHomeHtml() {
    const filePath = "public/home.html";
    let html = fs.readFileSync(filePath, "utf8");
    const original = html;

    // 1. Add skip-to-content link
    if (!html.includes('href="#main-content"')) {
        html = html.replace(
            '<div class="relative flex min-h-screen w-full flex-col">',
            '<div class="relative flex min-h-screen w-full flex-col">\n            <a href="#main-content" class="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-primary focus:text-white focus:rounded-lg focus:shadow-lg focus:outline-none">Skip to main content</a>'
        );
    }

    // 2. Add id="main-content" to <main>
    if (!html.includes('id="main-content"')) {
        html = html.replace(
            'class="flex flex-col gap-8 py-16 md:gap-12 md:py-24 overflow-hidden relative"',
            'id="main-content"\n                            class="flex flex-col gap-8 py-16 md:gap-12 md:py-24 overflow-hidden relative"'
        );
    }

    // 3. Mobile menu button: add aria-expanded and aria-controls
    if (!html.includes('aria-expanded="false"\n                                    aria-controls="mobile-menu"')) {
        html = html.replace(
            'id="mobile-menu-btn"\n                                    class="md:hidden p-2 text-primary dark:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"\n                                    aria-label="Toggle menu"',
            'id="mobile-menu-btn"\n                                    class="md:hidden p-2 text-primary dark:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"\n                                    aria-label="Toggle menu"\n                                    aria-expanded="false"\n                                    aria-controls="mobile-menu"'
        );
    }

    // 4. Mobile menu div: add aria-hidden
    if (!html.includes('aria-hidden="true"\n                            >')) {
        html = html.replace(
            'id="mobile-menu"\n                                class="hidden md:hidden border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900"',
            'id="mobile-menu"\n                                class="hidden md:hidden border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900"\n                                aria-hidden="true"'
        );
    }

    // 5. Desktop nav: add aria-label
    html = html.replace(
        '<nav class="flex items-center gap-6">',
        '<nav class="flex items-center gap-6" aria-label="Main navigation">'
    );

    // 6. Mobile nav: add aria-label
    html = html.replace(
        '<nav class="flex flex-col p-4 gap-4">',
        '<nav class="flex flex-col p-4 gap-4" aria-label="Mobile navigation">'
    );

    // 7. Hero section: add aria-label
    html = html.replace(
        'class="flex flex-col items-center gap-8 px-4 text-center md:gap-12 relative z-10"',
        'class="flex flex-col items-center gap-8 px-4 text-center md:gap-12 relative z-10"\n                                aria-label="Introduction"'
    );

    // 8. Why OpenInterview section: add aria-label
    html = html.replace(
        '<section\n                                class="w-full bg-neutral-50 dark:bg-neutral-900 py-12"\n                            >',
        '<section\n                                class="w-full bg-neutral-50 dark:bg-neutral-900 py-12"\n                                aria-label="Why OpenInterview"\n                            >'
    );

    // 9. Feature cards section: add aria-label
    html = html.replace(
        '<section\n                                class="w-full bg-background-light dark:bg-background-dark py-6 md:py-12"\n                            >',
        '<section\n                                class="w-full bg-background-light dark:bg-background-dark py-6 md:py-12"\n                                aria-label="Feature highlights"\n                            >'
    );

    // 10. How it works section: add aria-label
    html = html.replace(
        '<section class="w-full bg-background-light dark:bg-background-dark pt-6 md:pt-12 pb-3 md:pb-6">',
        '<section class="w-full bg-background-light dark:bg-background-dark pt-6 md:pt-12 pb-3 md:pb-6" aria-label="How it works">'
    );

    // 11. Testimonials section: add aria-label
    html = html.replace(
        '<section\n                                class="w-full bg-white dark:bg-neutral-900 py-12 border-t border-neutral-100 dark:border-neutral-800"\n                            >',
        '<section\n                                class="w-full bg-white dark:bg-neutral-900 py-12 border-t border-neutral-100 dark:border-neutral-800"\n                                aria-label="Testimonials"\n                            >'
    );

    // 12. CTA section: add aria-label
    html = html.replace(
        '<section\n                                class="w-full bg-white dark:bg-neutral-900 py-6"\n                            >',
        '<section\n                                class="w-full bg-white dark:bg-neutral-900 py-6"\n                                aria-label="Get started"\n                            >'
    );

    // 13. Carousel: add role and aria-label
    html = html.replace(
        'id="home-resume-carousel"\n                                                        class="w-full max-w-[360px] md:max-w-[320px] aspect-[4/3] rounded-xl overflow-hidden relative"',
        'id="home-resume-carousel"\n                                                        class="w-full max-w-[360px] md:max-w-[320px] aspect-[4/3] rounded-xl overflow-hidden relative"\n                                                        role="region"\n                                                        aria-label="Sample OpenInterview profiles"\n                                                        aria-roledescription="carousel"'
    );

    // 14. Decorative animation button: add aria-hidden and tabindex
    html = html.replace(
        'class="px-5 py-2 bg-primary text-white rounded-lg shadow-sm flex items-center gap-2 animate-button-press"\n                                                            >',
        'class="px-5 py-2 bg-primary text-white rounded-lg shadow-sm flex items-center gap-2 animate-button-press"\n                                                            aria-hidden="true"\n                                                            tabindex="-1"\n                                                            >'
    );

    // 15. Footer: add role="contentinfo"
    html = html.replace(
        '<footer\n                            class="border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 pt-16 pb-16"\n                        >',
        '<footer\n                            class="border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 pt-16 pb-16"\n                            role="contentinfo"\n                        >'
    );

    // 16. Update mobile menu JS toggle to manage aria attributes
    html = html.replace(
        `if (mobileMenuBtn && mobileMenu) {
                mobileMenuBtn.addEventListener("click", () => {
                    mobileMenu.classList.toggle("hidden");
                });
            }`,
        `if (mobileMenuBtn && mobileMenu) {
                mobileMenuBtn.addEventListener("click", () => {
                    const isExpanded = mobileMenuBtn.getAttribute("aria-expanded") === "true";
                    mobileMenuBtn.setAttribute("aria-expanded", String(!isExpanded));
                    mobileMenu.classList.toggle("hidden");
                    mobileMenu.setAttribute("aria-hidden", String(isExpanded));
                });
            }`
    );

    if (html !== original) {
        fs.writeFileSync(filePath, html, "utf8");
        console.log(`✓ Updated: ${filePath}`);
    } else {
        console.log(`⚠ No changes: ${filePath}`);
    }
}

function processPricingHtml() {
    const filePath = "public/pricing.html";
    let html = fs.readFileSync(filePath, "utf8");
    const original = html;

    // 1. Add skip-to-content link after <body ...>
    if (!html.includes('href="#main-content"')) {
        html = html.replace(
            '<body class="bg-background-light dark:bg-background-dark text-primary dark:text-white transition-colors duration-300">',
            '<body class="bg-background-light dark:bg-background-dark text-primary dark:text-white transition-colors duration-300">\n    <a href="#main-content" class="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-primary focus:text-white focus:rounded-lg focus:shadow-lg focus:outline-none">Skip to main content</a>'
        );
    }

    // 2. Add id="main-content" to <main>
    if (!html.includes('id="main-content"')) {
        html = html.replace(
            '<main class="pt-12 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">',
            '<main id="main-content" class="pt-12 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto" aria-label="Pricing plans">'
        );
    }

    // 3. Mobile menu button: add aria-expanded and aria-controls
    html = html.replace(
        '<button id="mobile-menu-btn" class="md:hidden p-2 text-primary dark:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors" aria-label="Toggle menu">',
        '<button id="mobile-menu-btn" class="md:hidden p-2 text-primary dark:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors" aria-label="Toggle menu" aria-expanded="false" aria-controls="mobile-menu">'
    );

    // 4. Mobile menu div: add aria-hidden
    html = html.replace(
        '<div id="mobile-menu" class="hidden md:hidden border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">',
        '<div id="mobile-menu" class="hidden md:hidden border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900" aria-hidden="true">'
    );

    // 5. Desktop nav: add aria-label
    html = html.replace(
        '<nav class="flex items-center gap-6">',
        '<nav class="flex items-center gap-6" aria-label="Main navigation">'
    );

    // 6. Mobile nav: add aria-label
    html = html.replace(
        '<nav class="flex flex-col p-4 gap-4">',
        '<nav class="flex flex-col p-4 gap-4" aria-label="Mobile navigation">'
    );

    // 7. Update mobile menu JS toggle
    html = html.replace(
        `if (mobileMenuBtn && mobileMenu) {
            mobileMenuBtn.addEventListener('click', () => {
                mobileMenu.classList.toggle('hidden');
            });
        }`,
        `if (mobileMenuBtn && mobileMenu) {
            mobileMenuBtn.addEventListener('click', () => {
                const isExpanded = mobileMenuBtn.getAttribute('aria-expanded') === 'true';
                mobileMenuBtn.setAttribute('aria-expanded', String(!isExpanded));
                mobileMenu.classList.toggle('hidden');
                mobileMenu.setAttribute('aria-hidden', String(isExpanded));
            });
        }`
    );

    if (html !== original) {
        fs.writeFileSync(filePath, html, "utf8");
        console.log(`✓ Updated: ${filePath}`);
    } else {
        console.log(`⚠ No changes: ${filePath}`);
    }
}

processHomeHtml();
processPricingHtml();
console.log("\nDone!");
