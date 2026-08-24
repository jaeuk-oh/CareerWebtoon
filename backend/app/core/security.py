import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.config import get_settings

security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Validate the bearer token by asking Supabase Auth who it belongs to.

    Avoids depending on the project's legacy shared JWT secret: token
    introspection via GoTrue works regardless of signing key type.
    """
    settings = get_settings()
    token = credentials.credentials
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{settings.SUPABASE_URL}/auth/v1/user",
                headers={
                    "Authorization": f"Bearer {token}",
                    "apikey": settings.SUPABASE_ANON_KEY,
                },
            )
    except httpx.HTTPError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="인증 서버에 연결할 수 없습니다.",
        )

    if response.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="인증이 만료되었거나 유효하지 않습니다.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = response.json()
    return {**user, "sub": user["id"]}
