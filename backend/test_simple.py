"""
Simple test to isolate uvicorn issue
"""

from fastapi import FastAPI

print("Creating simple FastAPI app...")
app = FastAPI(title="Test API")
print(f"App created: {app}")

@app.get("/")
async def root():
    return {"message": "Hello World"}

print("About to start uvicorn...")
if __name__ == "__main__":
    import uvicorn
    print("Starting uvicorn...")
    uvicorn.run(app, host="0.0.0.0", port=8004)
    print("Uvicorn started!")
