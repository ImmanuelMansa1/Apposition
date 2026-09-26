import json
import os
from fastapi import FastAPI
from pathlib import Path

app = FastAPI()

BASE_DIR = Path(__file__).parent

@app.post("/similarity")
def similarity(request: dict):

    print("Received request from C#:")
    print(json.dumps(request, indent=4))

    response = {
        "results": []
    }

    competitors_file = BASE_DIR / "competitors.json"
    results_file = BASE_DIR / "results.json"

    with open(competitors_file, "w") as file:
        json.dump(request, file, indent=4)

    with open(results_file, "w") as file:
        json.dump(response, file, indent=4)

    print("Competitors saved to:", competitors_file)
    print("Results saved to:", results_file)

    print("\nResults:")
    print(json.dumps(response, indent=4))

    return response