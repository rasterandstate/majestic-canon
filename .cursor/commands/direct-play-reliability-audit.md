# Direct Play Reliability Audit

## Overview

Audit the streaming layer for reliability, resource safety, and correct HTTP range handling.

## Steps

1. Inspect /stream/media_file endpoint.
2. Verify correct handling of:
   - Range headers
   - Partial content (206)
   - Abort events
   - Client disconnect
3. Ensure no unbounded buffers.
4. Confirm no orphaned child processes.
5. Validate prewarm logic does not leak resources.
6. Confirm proper cleanup on error paths.

## Checklist

- [ ] Range requests correct
- [ ] No FD leaks
- [ ] No memory growth per abort
- [ ] No orphaned ffmpeg processes
- [ ] Abort path tested

## Output

Provide:

- Any leak vectors
- Any blocking operations
- Risk level assessment
