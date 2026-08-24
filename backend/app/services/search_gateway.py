import logging

import httpx

from app.core.config import get_settings

logger = logging.getLogger(__name__)

EXA_SEARCH_URL = "https://api.exa.ai/search"


class SearchResult:
    def __init__(self, title: str, url: str, highlights: list[str]):
        self.title = title
        self.url = url
        self.highlights = highlights


class SearchGateway:
    def __init__(self):
        settings = get_settings()
        self._api_key = settings.EXA_API_KEY

    async def search(self, query: str, num_results: int = 5) -> list[SearchResult]:
        """
        Runs one Exa neural search and returns title/url/highlight snippets — no full
        page bodies, so the LLM synthesis prompt stays a manageable size even across
        several queries per company.
        """
        if not self._api_key:
            return []
        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                response = await client.post(
                    EXA_SEARCH_URL,
                    headers={"x-api-key": self._api_key, "Content-Type": "application/json"},
                    json={
                        "query": query,
                        "numResults": num_results,
                        "type": "auto",
                        "contents": {"highlights": {"numSentences": 3, "highlightsPerUrl": 2}},
                    },
                )
            if response.status_code != 200:
                logger.error(f"Exa search failed for query {query!r}: {response.status_code} {response.text}")
                return []
            data = response.json()
        except httpx.HTTPError as e:
            logger.error(f"Exa search request error for query {query!r}: {e!r}")
            return []

        results = []
        for item in data.get("results", []):
            results.append(
                SearchResult(
                    title=item.get("title") or item.get("url", ""),
                    url=item.get("url", ""),
                    highlights=item.get("highlights") or [],
                )
            )
        return results


def get_search_gateway() -> SearchGateway:
    return SearchGateway()
