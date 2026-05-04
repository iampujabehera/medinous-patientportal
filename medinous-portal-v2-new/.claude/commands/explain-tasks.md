Scan the entire project and explain all tasks, features, and work items in plain English. Here's what to do:

1. Read the CLAUDE.md file for project context
2. Scan all feature modules under `src/app/features/` — read each component, service, and template
3. Scan `src/app/shared/` and `src/app/core/` for shared functionality
4. Look for any TODO/FIXME/HACK comments across the codebase
5. Check the README.md and any other documentation files

Then produce a clear, plain-English summary organized as follows:

## What This App Does
A one-paragraph explanation a non-technical person could understand.

## Features (What Each Module Does)
For each feature module, explain:
- **What it does** — in simple English, like explaining to a hospital admin
- **How it works** — the user flow in 2-3 bullet points
- **Current status** — is it using mock data? Is anything incomplete?

## Pending Work (TODOs & FIXMEs)
List any TODO/FIXME/HACK comments found in the code, grouped by feature, with a plain-English explanation of what each one means.

## What's Missing
Based on the CLAUDE.md and code, note any features mentioned but not yet built, or areas that are clearly placeholder/stub.

Keep the language simple and jargon-free. Write as if explaining to someone who will demo this product to hospital clients.
