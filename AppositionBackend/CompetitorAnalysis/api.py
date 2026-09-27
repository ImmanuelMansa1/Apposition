from fastapi import FastAPI
from pydantic import BaseModel, Field

from main import (
    parse_itunes_data,
    embed_competitor_apps,
    cosine_similarity_score,
)

app = FastAPI()


class Candidate(BaseModel):
    name: str = ""
    developer: str = ""
    price: str = ""
    description: str = ""
    trackId: int | None = None


class SimilarityRequest(BaseModel):
    appIdea: str
    keyFeatures: list[str] = Field(default_factory=list)
    targetAudience: str = ""
    competitors: list[Candidate]


@app.post("/similarity")
def similarity(request: SimilarityRequest):
    user_input = {
        "AppName": "",
        "Description": request.appIdea,
        "Features": [
            feature.strip()
            for feature in request.keyFeatures
            if feature.strip()
        ],
        "Target_Audience": request.targetAudience,
    }

    # Restore the iTunes field names expected by parse_itunes_data().
    itunes_data = {
        "results": [
            {
                "trackName": item.name,
                "artistName": item.developer,
                "formattedPrice": item.price,
                "description": item.description,
                "trackId": item.trackId,
            }
            for item in request.competitors
        ]
    }

    parsed = parse_itunes_data(itunes_data)
    candidate_count = len(parsed["apps"])

    if not parsed["apps"]:
        return {
            "results": [],
            "candidate_count": 0,
            "returned_count": 0,
        }

    embedded = embed_competitor_apps(parsed)
    top_five = cosine_similarity_score(user_input, embedded)

    return {
        "results": top_five["apps"],
        "candidate_count": candidate_count,
        "returned_count": len(top_five["apps"]),
    }