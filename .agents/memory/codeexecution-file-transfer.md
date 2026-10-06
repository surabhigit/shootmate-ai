---
name: CodeExecution file transfer
description: Reliable movement of repository snapshots through durable execution.
---

Use shell commands for metadata and short file lists. For larger repository snapshots, read tracked files with `readFile` in bounded batches and pass the content directly to the integration call. Do not assume large `shellExec` output is complete or that tab-separated metadata will remain unchanged.

**Why:** A GitHub sync showed that a large shell output was incomplete and tabs in `git ls-files -s` output were stripped, making snapshot reconstruction unreliable.

**How to apply:** When transferring repository contents through CodeExecution, get paths and modes as JSON, read source files with `readFile`, and verify remote blob hashes after writing.