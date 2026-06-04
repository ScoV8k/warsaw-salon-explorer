import os
import uvicorn

from src.app import create_app

app = create_app()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 3001))
    print(f"Server running on http://localhost:{port}")
    print(f"API:    http://localhost:{port}/api/salons")
    print(f"Docs:   http://localhost:{port}/docs")
    uvicorn.run("run:app", host="0.0.0.0", port=port, reload=os.environ.get("ENV") != "production")

