"""Python API for competitor ranking and review-backed analysis."""

import logging

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

# main.py loads the SentenceTransformer model once.
from main import (
    parse_itunes_data,
    embed_competitor_apps,
    cosine_similarity_score,
    plan_search_terms,
    model,
)
from feature_similarity_engine import build_feature_matrix, attach_feature_matches
from filter_reviews import recent_negative_reviews
from gemini_api import analyze_competitors


app = FastAPI()
logger = logging.getLogger(__name__)


class Candidate(BaseModel):
    name: str = ""
    developer: str = ""
    price: str = ""
    description: str = ""
    trackId: int | None = None


class SearchTermsRequest(BaseModel):
    appIdea: str = Field(min_length=1, max_length=1000)
    appName: str = ""
    keyFeatures: list[str] = Field(default_factory=list)
    targetAudience: str = ""


class SimilarityRequest(SearchTermsRequest):
    competitors: list[Candidate]


@app.post("/search-terms")
def search_terms(request: SearchTermsRequest):
    # The planner and scorer receive the same idea fields.
    user_input = {
        "AppName": request.appName,
        "Description": request.appIdea,
        "Features": request.keyFeatures,
        "Target_Audience": request.targetAudience,
    }

    try:
        return {"search_terms": plan_search_terms(user_input)}
    except Exception as error:
        logger.exception("Search-term planning failed")
        raise HTTPException(
            status_code=503, detail="Query planning failed"
        ) from error


@app.post("/similarity")
def similarity(request: SimilarityRequest):
    # Match the user dictionary expected by main.py and Gemini.
    user_input = {
        "AppName": request.appName,
        "Description": request.appIdea,
        "Features": [
            feature.strip()
            for feature in request.keyFeatures
            if feature.strip()
        ],
        "Target_Audience": request.targetAudience,
    }

    # Restore iTunes field names for the existing parser.
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
            "feature_matrix": {"competitors": [], "rows": []},
            "reviews": {"apps": []},
            "review_status": "no_competitors",
            "analysis": None,
            "analysis_status": "no_competitors",
        }

    # Score first. Every subsequent app_index uses this ranked order.
    embedded = embed_competitor_apps(parsed)
    top_five = cosine_similarity_score(user_input, embedded)

    # Compare each user feature with passages from those five listings.
    feature_matrix = build_feature_matrix(user_input, top_five, model)
    attach_feature_matches(top_five, feature_matrix)

    # Gather up to five recent 1- or 2-star reviews per competitor.
    try:
        reviews = recent_negative_reviews(top_five)

        if (
            len(reviews["apps"]) != len(top_five["apps"])
            or any(
                app["AppName"] != group["AppName"]
                for app, group in zip(top_five["apps"], reviews["apps"])
            )
        ):
            raise ValueError("Reviews do not match the ranked apps")
    except Exception:
        logger.exception("Review collection failed")
        reviews = {
            "apps": [
                {
                    "AppName": app["AppName"],
                    "reviews": [],
                    "error": "Reviews unavailable",
                }
                for app in top_five["apps"]
            ]
        }

    # Gemini explains existing scores and evidence; it does not set scores.
    analysis = None
    analysis_status = "available"

    try:
        analysis = analyze_competitors(
            user_input, top_five, feature_matrix, reviews
        )
    except Exception:
        logger.exception("Gemini analysis failed")
        analysis_status = "unavailable"

    return {
        "results": top_five["apps"],
        "candidate_count": candidate_count,
        "returned_count": len(top_five["apps"]),
        "feature_matrix": feature_matrix,
        "reviews": reviews,
        "review_status": (
            "partial"
            if any(group.get("error") for group in reviews["apps"])
            else "available"
        ),
        "analysis": analysis,
        "analysis_status": analysis_status,
    }