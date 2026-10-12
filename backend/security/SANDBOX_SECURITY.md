# Sandbox Security

Covers execution of untrusted code submitted by users.

## Status

The sandbox runner is not yet implemented. `agent/nodes/run_tests.py` currently returns `"skipped"` with the message `"sandbox runner not wired yet"`. No user-submitted code is executed anywhere in the application.

The design below describes the intended implementation.

## Why the Sandbox Exists

User submissions include `test_code` and, in future versions, will be subject to linters and type checkers. Executing this code in the FastAPI process would allow:

- CPU exhaustion (`while True: pass`)
- Filesystem access (`open("/etc/passwd")`)
- Host commands (`os.system("rm -rf /")`)
- Network access (`socket.connect(...)`)
- Fork bombs

## Intended Controls

### Docker Isolation
Each check runs in a fresh container via `docker run --rm` based on `python:3.11-slim`.

### Network Disabled
`--network none`

### Read-Only Filesystem
`--read-only`

If writable temp space is needed:
`--tmpfs /tmp:rw,noexec,nosuid,size=64m`

### Non-Root User
`--user 65534:65534`

### Capabilities Dropped
`--cap-drop ALL`
`--security-opt no-new-privileges`

### Resource Limits
`--memory 256m`
`--cpus 0.5`
`--pids-limit 64`

### Timeout
`subprocess.run(..., timeout=30)`

### Output Capture
`stdout` and `stderr` captured separately and truncated before storage.

## Known Gaps in the Current Draft

- `subprocess.run(timeout=...)` kills the Docker CLI, not the container. A named container with an explicit `docker kill` on timeout is required.
- Custom seccomp profile not yet defined.
- `--tmpfs /tmp` not added; some Python operations may fail without it.
- Output size limits not enforced.
- `SANDBOX_TIMEOUT_SECONDS`, `SANDBOX_MEMORY_LIMIT_MB`, `SANDBOX_CPU_LIMIT` are read from `.env` but not yet applied at runtime.
- Only Python is supported. Node, Java, and Go runtimes are not yet available.

## Deployment Requirements

- Docker must be installed and running on the host.
- The FastAPI process must be able to invoke `docker`.
- The Docker socket must not be mounted into the FastAPI container in a containerized deployment.
- Concurrency should be capped to prevent host resource starvation.

## Verification Checklist

Before relying on the sandbox:

1. `print(open("/etc/passwd").read())` — expected to fail
2. `import socket; socket.create_connection(("1.1.1.1", 80))` — expected to fail
3. `while True: pass` — expected to time out
4. `x = "a" * (10**9)` — expected to be OOM-killed
5. `import os; os.fork()` in a loop — expected to hit the PID limit

## Residual Risk

- Kernel-level container escape via a Linux CVE.
- Host resource starvation under concurrent load.
- Timing side channels between containers are not addressed.