import httpx
import time

def test_local_ai():
    # 1. The Local Ollama API Endpoint
    url = "http://localhost:11434/api/generate"
    
    # 2. The Prompt (Our Resume vs JD test)
    prompt_text = """
    Act as an expert technical recruiter. Read the following Job Description and Candidate Resume. 
    1. Give the candidate a match score from 0 to 100.
    2. Provide 3 short bullet points explaining why they got that score.

    --- JOB DESCRIPTION ---
    Looking for a Backend Developer with 3+ years of experience in Python and FastAPI. Must have experience deploying applications using Docker and Cloudflare. Knowledge of Machine Learning integration (like PyTorch) is a huge plus.

    --- CANDIDATE RESUME ---
    Full-stack software developer and application architect specializing in Python and web infrastructure. 
    Skills: FastAPI, MySQL, Docker, Cloudflare Pages, Render. 
    Experience: Built and deployed the AI-powered "Skreenit" job portal from scratch. Migrated machine learning models (InsightFace, Whisper) to ONNX Runtime. Managed complex DNS migrations using Cloudflare.
    """

    # 3. The JSON Payload
    # 'stream': False tells Ollama to wait and send the whole answer at once
    payload = {
        "model": "llama3",
        "prompt": prompt_text,
        "stream": False 
    }

    print("🚀 Sending request to Local Llama-3...")
    start_time = time.time()

    try:
        # 4. Make the actual API Call (Timeout set to 60s because AI takes time to think)
        with httpx.Client(timeout=60.0) as client:
            response = client.post(url, json=payload)
            response.raise_for_status() # Check for HTTP errors
            
            # 5. Extract the AI's response
            result = response.json()
            end_time = time.time()
            
            print(f"✅ Success! AI responded in {round(end_time - start_time, 2)} seconds.\n")
            print("--- AI EVALUATION ---")
            print(result["response"])
            
    except Exception as e:
        print(f"❌ API Call Failed: {e}")
        print("Make sure Ollama is running in the background!")

if __name__ == "__main__":
    test_local_ai()