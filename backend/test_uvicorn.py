"""
Test uvicorn directly to see if it's the issue
"""

print("Testing uvicorn directly...")

try:
    import uvicorn
    print("✅ Uvicorn imported successfully")
    
    from fastapi import FastAPI
    print("✅ FastAPI imported successfully")
    
    app = FastAPI()
    print("✅ FastAPI app created")
    
    @app.get("/")
    async def root():
        return {"message": "Hello World"}
    
    print("About to start uvicorn...")
    uvicorn.run(app, host="0.0.0.0", port=8081, log_level="info")
    print("✅ Uvicorn completed")
    
except Exception as e:
    print(f"❌ Error: {str(e)}")
    print(f"❌ Error type: {type(e).__name__}")
    import traceback
    traceback.print_exc()
