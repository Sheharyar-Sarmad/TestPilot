"""
Source ingestion service.

Fetches a single source file from a GitHub URL with strict SSRF protection.
Only public GitHub blob URLs and raw.githubusercontent.com URLs are allowed.
Private IP ranges, localhost, and cloud metadata endpoints are blocked.
"""

from __future__ import annotations

import ipaddress
import re
import socket
from dataclasses import dataclass
from typing import Optional
from urllib.parse import urlparse

import httpx

# Constants

# Only these hosts are ever reachable.
ALLOWED_HOSTS = {
    "github.com",
    "raw.githubusercontent.com",
}

# Accept only single-file URLs:
#   https://github.com/<owner>/<repo>/blob/<ref>/<path>
#   https://raw.githubusercontent.com/<owner>/<repo>/<ref>/<path>
GITHUB_BLOB_RE = re.compile(
    r"^https://github\.com/[^/\s]+/[^/\s]+/blob/[^/\s]+/.+$"
)
GITHUB_RAW_RE = re.compile(
    r"^https://raw\.githubusercontent\.com/[^/\s]+/[^/\s]+/[^/\s]+/.+$"
)

# Hard limits
MAX_FILE_BYTES = 1_000_000  # 1 MB — mirrors the frontend cap
FETCH_TIMEOUT_SECONDS = 10.0
USER_AGENT = "TestPilotAI/1.0 (+https://testpilot.ai)"

# Blocks for SSRF (defense in depth)
BLOCKED_NETWORKS = [
    ipaddress.ip_network("0.0.0.0/8"),
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("169.254.0.0/16"),   # AWS/GCP/Azure metadata
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("::1/128"),
    ipaddress.ip_network("fc00::/7"),
    ipaddress.ip_network("fe80::/10"),
]

# Extension → language mapping (mirrors frontend EXT map)
EXT_TO_LANG = {
    "py": "Python", "js": "JavaScript", "jsx": "JavaScript", "mjs": "JavaScript",
    "ts": "TypeScript", "tsx": "TypeScript", "go": "Go", "rs": "Rust",
    "java": "Java", "c": "C", "h": "C", "cpp": "C++", "cc": "C++",
    "cs": "C#", "rb": "Ruby", "php": "PHP", "swift": "Swift", "kt": "Kotlin",
}

# Errors

class SourceIngestionError(Exception):
    """Raised for any failure while validating or fetching a source file."""

    def __init__(self, message: str, *, status_code: int = 400) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code


# Result
@dataclass(slots=True)
class IngestedSource:
    """Normalized output of a successful ingestion."""

    code: str
    filename: str
    language: str
    source_url: str
    size_bytes: int


# SSRF guard
def _is_private_ip(host: str) -> bool:
    """Resolve host and check whether any resolved IP is private/reserved."""
    try:
        infos = socket.getaddrinfo(host, None)
    except socket.gaierror:
        # DNS failure — treat as unsafe (fail closed).
        return True

    for info in infos:
        addr = info[4][0]
        try:
            ip = ipaddress.ip_address(addr)
        except ValueError:
            continue
        if any(ip in net for net in BLOCKED_NETWORKS):
            return True
        if ip.is_private or ip.is_loopback or ip.is_reserved or ip.is_link_local:
            return True
    return False


def _validate_url(url: str) -> str:
    """Validate a GitHub URL and return the equivalent raw URL."""
    url = url.strip()

    if not (GITHUB_BLOB_RE.match(url) or GITHUB_RAW_RE.match(url)):
        raise SourceIngestionError(
            "Only single-file GitHub URLs are supported. "
            "Expected https://github.com/owner/repo/blob/<ref>/<path> "
            "or https://raw.githubusercontent.com/owner/repo/<ref>/<path>."
        )

    parsed = urlparse(url)
    host = (parsed.hostname or "").lower()

    if host not in ALLOWED_HOSTS:
        raise SourceIngestionError(
            f"Host '{host}' is not allowed. Only github.com and "
            "raw.githubusercontent.com are accepted."
        )

    if _is_private_ip(host):
        raise SourceIngestionError(
            "Refusing to fetch: the resolved address is private or reserved.",
            status_code=403,
        )

    # Normalize: convert a github.com blob URL into its raw equivalent
    if host == "github.com":
        rest = url[len("https://github.com/") :]
        segments = rest.split("/")
        if len(segments) < 5 or segments[2] != "blob":
            raise SourceIngestionError("Malformed GitHub blob URL.")
        owner, repo, _, ref = segments[0], segments[1], segments[2], segments[3]
        path = "/".join(segments[4:])
        return f"https://raw.githubusercontent.com/{owner}/{repo}/{ref}/{path}"

    return url


def _language_from_filename(name: str) -> str:
    ext = name.rsplit(".", 1)[-1].lower() if "." in name else ""
    return EXT_TO_LANG.get(ext, "Auto-detect")

# Fetcher
class GitHubFetcher:
    """
    Fetches a single source file from GitHub with SSRF protection and size caps.

    Usage:
        fetcher = GitHubFetcher()
        source = await fetcher.fetch("https://github.com/owner/repo/blob/main/app.py")
        print(source.code, source.language)
    """

    def __init__(
        self,
        *,
        timeout: float = FETCH_TIMEOUT_SECONDS,
        max_bytes: int = MAX_FILE_BYTES,
        client: Optional[httpx.AsyncClient] = None,
    ) -> None:
        self.timeout = timeout
        self.max_bytes = max_bytes
        self._client = client
        self._owns_client = client is None

    async def __aenter__(self) -> "GitHubFetcher":
        if self._client is None:
            self._client = httpx.AsyncClient(
                timeout=self.timeout,
                headers={"User-Agent": USER_AGENT, "Accept": "text/plain,*/*"},
                follow_redirects=False,  # never follow — prevents SSRF pivots
            )
        return self

    async def __aexit__(self, *_: object) -> None:
        await self.close()

    async def close(self) -> None:
        if self._owns_client and self._client is not None:
            await self._client.aclose()
            self._client = None

    async def fetch(self, url: str) -> IngestedSource:
        """Fetch a single source file. Raises SourceIngestionError on any failure."""
        raw_url = _validate_url(url)

        if self._client is None:
            # Lazy init so callers can use `await GitHubFetcher().fetch(...)`.
            await self.__aenter__()

        try:
            async with self._client.stream("GET", raw_url) as resp:
                if resp.status_code != 200:
                    raise SourceIngestionError(
                        f"GitHub returned HTTP {resp.status_code} for the file.",
                        status_code=502,
                    )

                # Reject anything that looks binary early.
                ctype = resp.headers.get("content-type", "").lower()
                if "text" not in ctype and "json" not in ctype and "octet-stream" not in ctype:
                    raise SourceIngestionError(
                        f"Unsupported content-type: {ctype}",
                        status_code=415,
                    )

                # Enforce size cap *while* streaming (never buffer more than max).
                chunks: list[bytes] = []
                total = 0
                async for chunk in resp.aiter_bytes():
                    total += len(chunk)
                    if total > self.max_bytes:
                        raise SourceIngestionError(
                            f"File exceeds {self.max_bytes // 1000} KB limit.",
                            status_code=413,
                        )
                    chunks.append(chunk)

                raw = b"".join(chunks)

        except httpx.TimeoutException as exc:
            raise SourceIngestionError(
                "Timed out while fetching the file from GitHub.", status_code=504
            ) from exc
        except httpx.HTTPError as exc:
            raise SourceIngestionError(
                f"Network error while fetching the file: {exc}", status_code=502
            ) from exc

        # Reject binary (NUL byte) content.
        if b"\x00" in raw:
            raise SourceIngestionError(
                "That looks like a binary file. Submit a source file.",
                status_code=415,
            )

        try:
            code = raw.decode("utf-8")
        except UnicodeDecodeError as exc:
            raise SourceIngestionError(
                "File is not valid UTF-8 text.", status_code=415
            ) from exc

        filename = raw_url.rsplit("/", 1)[-1] or "source"
        language = _language_from_filename(filename)

        return IngestedSource(
            code=code,
            filename=filename,
            language=language,
            source_url=url,
            size_bytes=len(raw),
        )

    # ------------------------------------------------------------------
    # Compatibility wrapper for processes.py
    # ------------------------------------------------------------------
    @staticmethod
    async def fetch_file(url: str) -> str:
        """
        Static wrapper used by app/routes/processes.py.
        
        Instantiates the fetcher, runs the full ingestion pipeline, and 
        returns just the source code string (since processes.py expects a string).
        """
        async with GitHubFetcher() as fetcher:
            result = await fetcher.fetch(url)
            return result.code