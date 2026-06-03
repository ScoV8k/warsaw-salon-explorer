import uvicorn

from src.app import create_app

app = create_app()

if __name__ == "__main__":
    print("Server running on http://localhost:3001")
    print("API:    http://localhost:3001/api/salons")
    print("Docs:   http://localhost:3001/docs")
    uvicorn.run("run:app", host="0.0.0.0", port=3001, reload=True)
