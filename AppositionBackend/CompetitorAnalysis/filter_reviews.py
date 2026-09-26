
import json
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

# Originally this API was in Typescript, but it was easier to implement in Python because of the XML parsing and HTTP requests.
ATOM = "{http://www.w3.org/2005/Atom}"
ITUNES = "{http://itunes.apple.com/rss}"


def _fetch(url):
    request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(request, timeout=8) as response:
        return response.read()


def _find_app_id(app, country):
    # Search using the app name supplied by similarity_engine.py.
    name = app["AppName"].strip()
    query = urllib.parse.urlencode({
        "term": name, "country": country, "entity": "software", "limit": 50
    })
    results = json.loads(_fetch(f"https://itunes.apple.com/search?{query}"))["results"]
    matches = [item for item in results
               if item.get("trackName", "").casefold() == name.casefold()]

    # Avoid attaching reviews from a different app with the same name.
    developer = app.get("Developer", "").strip().casefold()
    if developer:
        matches = [item for item in matches if developer in {
            item.get("artistName", "").casefold(),
            item.get("sellerName", "").casefold(),
        }]
    if len(matches) != 1:
        raise ValueError(
            f"Expected one exact App Store match for {name!r}; found {len(matches)}"
        )
    return matches[0]["trackId"]


def recent_negative_reviews(competitor_data, country="us", per_app=5, max_pages=10):
    """Return each app's newest available reviews rated below 3 stars."""
    output = {"apps": []}

    for app in competitor_data["apps"]:
        result = {"AppName": app["AppName"], "reviews": []}
        output["apps"].append(result)

        try:
            app_id = _find_app_id(app, country)
            result["AppId"] = app_id

            for page in range(1, max_pages + 1):
                url = (
                    f"https://itunes.apple.com/{country}/rss/customerreviews/"
                    f"page={page}/id={app_id}/sortby=mostrecent/xml"
                )
                try:
                    feed = ET.fromstring(_fetch(url))
                except urllib.error.HTTPError as error:
                    if error.code == 404:
                        break
                    raise

                entries = feed.findall(f"{ATOM}entry")
                if not entries:
                    break

                for entry in entries:
                    rating = entry.findtext(f"{ITUNES}rating")
                    if rating not in ("1", "2"):
                        continue

                    result["reviews"].append({
                        "rating": int(rating),
                        "title": entry.findtext(f"{ATOM}title", default=""),
                        "text": entry.findtext(f"{ATOM}content", default=""),
                        "updated": entry.findtext(f"{ATOM}updated", default=""),
                    })

                if len(result["reviews"]) >= per_app:
                    break

            result["reviews"].sort(
                key=lambda review: review["updated"], reverse=True
            )
            result["reviews"] = result["reviews"][:per_app]

        except (ValueError, KeyError, urllib.error.URLError, ET.ParseError) as error:
            result["error"] = str(error)

    return output