from fastapi import FastAPI

app = FastAPI()

@app.post("/similarity")
def similarity(request: dict):
    print("Received request from C#:")
    print(request)

    return {
        "results": []
    }