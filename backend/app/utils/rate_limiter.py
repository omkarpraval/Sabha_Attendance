import time
from collections import defaultdict
from fastapi import Request, HTTPException, status

class SimpleRateLimiter:
    def __init__(self, max_requests: int, window_seconds: int):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests = defaultdict(list)

    def check(self, client_ip: str):
        now = time.time()
        # Clear timestamps outside window
        self.requests[client_ip] = [
            t for t in self.requests[client_ip] if now - t < self.window_seconds
        ]
        if len(self.requests[client_ip]) >= self.max_requests:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded. Please wait {self.window_seconds} seconds before retrying."
            )
        self.requests[client_ip].append(now)

login_limiter = SimpleRateLimiter(max_requests=30, window_seconds=60)
scan_limiter = SimpleRateLimiter(max_requests=50, window_seconds=60)
