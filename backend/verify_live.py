import urllib.request
import json

try:
    with urllib.request.urlopen("http://127.0.0.1:8000/") as response:
        data = response.read().decode()
        print("Backend Status:", data)

    with urllib.request.urlopen("http://localhost:5173/") as response:
        status = response.getcode()
        print("Frontend Status Code:", status)
        
    print("BOTH BACKEND AND FRONTEND SERVERS ARE LIVE & RESPONDING!")
except Exception as e:
    print("Server connection test:", e)
