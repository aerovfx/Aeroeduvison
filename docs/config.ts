/**
 * Documentation Navigation Configuration
 * Structure similar to Cursor Docs
 */

export const docsConfig = {
    mainNav: [
        {
            title: "Documentation",
            href: "/docs",
        },
        {
            title: "Guides",
            href: "/docs/guides",
        },
        {
            title: "API Reference",
            href: "/docs/api",
        },
        {
            title: "Community",
            href: "/community",
        },
    ],
    sidebarNav: [
        {
            title: "Getting Started",
            items: [
                {
                    title: "Introduction",
                    href: "/docs/getting-started/introduction",
                    items: [],
                },
                {
                    title: "Installation",
                    href: "/docs/getting-started/installation",
                    items: [],
                },
                {
                    title: "Quick Start",
                    href: "/docs/getting-started/quick-start",
                    items: [],
                },
                {
                    title: "Environment Setup",
                    href: "/docs/getting-started/environment-setup",
                    items: [],
                },
            ],
        },
        {
            title: "Authentication",
            items: [
                {
                    title: "Overview",
                    href: "/docs/authentication/overview",
                    items: [],
                },
                {
                    title: "NextAuth Setup",
                    href: "/docs/authentication/nextauth-setup",
                    items: [],
                },
                {
                    title: "User Management",
                    href: "/docs/authentication/user-management",
                    items: [],
                },
                {
                    title: "Session Handling",
                    href: "/docs/authentication/session-handling",
                    items: [],
                },
                {
                    title: "Two-Factor Auth",
                    href: "/docs/authentication/2fa",
                    items: [],
                },
                {
                    title: "OAuth Providers",
                    href: "/docs/authentication/oauth-providers",
                    items: [],
                },
            ],
        },
        {
            title: "Simulations & Labs",
            items: [
                {
                    title: "Overview",
                    href: "/docs/simulations/overview",
                    items: [],
                },
                {
                    title: "Quick Start Labs",
                    href: "/docs/simulations/quick-start-labs",
                    items: [],
                },
                {
                    title: "Python Simulations",
                    href: "/docs/simulations/python-simulations",
                    items: [],
                },
                {
                    title: "Physics Labs",
                    href: "/docs/simulations/physics-labs",
                    items: [],
                },
                {
                    title: "Chemistry Labs",
                    href: "/docs/simulations/chemistry-labs",
                    items: [],
                },
                {
                    title: "Custom Simulations",
                    href: "/docs/simulations/custom-simulations",
                    items: [],
                },
            ],
        },
        {
            title: "OCR & Auto-Grading",
            items: [
                {
                    title: "Overview",
                    href: "/docs/ocr-grading/overview",
                    items: [],
                },
                {
                    title: "Advanced Pipeline",
                    href: "/docs/ocr-grading/advanced-pipeline",
                    items: [],
                },
                {
                    title: "ML Training",
                    href: "/docs/ocr-grading/ml-training",
                    items: [],
                },
                {
                    title: "Auto Grading",
                    href: "/docs/ocr-grading/auto-grading",
                    items: [],
                },
                {
                    title: "PaddleOCR Integration",
                    href: "/docs/ocr-grading/paddleocr",
                    items: [],
                },
            ],
        },
        {
            title: "AI Features",
            items: [
                {
                    title: "Overview",
                    href: "/docs/ai-features/overview",
                    items: [],
                },
                {
                    title: "Content Generator",
                    href: "/docs/ai-features/content-generator",
                    items: [],
                },
                {
                    title: "Intelligent Tutoring",
                    href: "/docs/ai-features/intelligent-tutoring",
                    items: [],
                },
                {
                    title: "Learning Path Builder",
                    href: "/docs/ai-features/learning-path-builder",
                    items: [],
                },
                {
                    title: "AI API Integration",
                    href: "/docs/ai-features/api-integration",
                    items: [],
                },
            ],
        },
        {
            title: "Deployment",
            items: [
                {
                    title: "Overview",
                    href: "/docs/deployment/overview",
                    items: [],
                },
                {
                    title: "Google Cloud Run",
                    href: "/docs/deployment/cloud-run",
                    items: [],
                },
                {
                    title: "Docker Configuration",
                    href: "/docs/deployment/docker",
                    items: [],
                },
                {
                    title: "Environment Variables",
                    href: "/docs/deployment/environment-variables",
                    items: [],
                },
                {
                    title: "Database Setup",
                    href: "/docs/deployment/prisma",
                    items: [],
                },
                {
                    title: "Cloud SQL",
                    href: "/docs/deployment/cloud-sql",
                    items: [],
                },
                {
                    title: "CI/CD Pipeline",
                    href: "/docs/deployment/cicd",
                    items: [],
                },
            ],
        },
        {
            title: "API Reference",
            items: [
                {
                    title: "REST API",
                    href: "/docs/api-reference/rest-api",
                    items: [],
                },
                {
                    title: "WebSocket Events",
                    href: "/docs/api-reference/websocket",
                    items: [],
                },
                {
                    title: "Python API",
                    href: "/docs/api-reference/python-api",
                    items: [],
                },
                {
                    title: "Authentication API",
                    href: "/docs/api-reference/auth-api",
                    items: [],
                },
                {
                    title: "Simulations API",
                    href: "/docs/api-reference/simulations-api",
                    items: [],
                },
            ],
        },
        {
            title: "Troubleshooting",
            items: [
                {
                    title: "Common Issues",
                    href: "/docs/troubleshooting/common-issues",
                    items: [],
                },
                {
                    title: "Debug Guide",
                    href: "/docs/troubleshooting/debug-guide",
                    items: [],
                },
                {
                    title: "Testing Guide",
                    href: "/docs/troubleshooting/testing-guide",
                    items: [],
                },
                {
                    title: "Performance",
                    href: "/docs/troubleshooting/performance",
                    items: [],
                },
                {
                    title: "FAQ",
                    href: "/docs/troubleshooting/faq",
                    items: [],
                },
            ],
        },
    ],
}

export type DocsConfig = typeof docsConfig
