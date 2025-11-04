import jwt
from django.conf import settings
from django.http import JsonResponse
import logging

logger = logging.getLogger(__name__)


class ClerkJWTMiddleware:

    def __init__(self, get_response):
        self.get_response = get_response
        self.clerk_secret_key = settings.CLERK_SECRET_KEY

        if not self.clerk_secret_key:
            logger.warning("CLERK_SECRET_KEY not set. JWT verification will be disabled.")

    def __call__(self, request):
        # Handle CORS preflight requests immediately
        if request.method == 'OPTIONS':
            response = JsonResponse({'status': 'OK'})
            response['Access-Control-Allow-Origin'] = '*'
            response['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
            response['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With'
            return response

        # Log the request path for debugging
        logger.info(f"Processing request to: {request.path}")
        logger.info(f"Request method: {request.method}")
        
        # Log all headers for debugging
        for header, value in request.META.items():
            if header.startswith('HTTP_'):
                logger.info(f"Header {header}: {value}")
        
        # Skip auth for selected paths; still try to authenticate search requests if a token is present
        if self._should_skip_auth(request.path):
            logger.info(f"Skipping auth for path: {request.path}")
            if request.path.startswith('/api/search/'):
                auth_header = request.META.get('HTTP_AUTHORIZATION', '')
                if auth_header.startswith('Bearer '):
                    token = auth_header.split(' ')[1]
                    user_info = self._verify_token(token)
                    if user_info:
                        request.clerk_user_id = user_info.get('sub')
                        request.clerk_user = user_info
                        logger.info(f"Search with authenticated user: {request.clerk_user_id}")
                    else:
                        stable_id = f"dev_user_{abs(hash(token[:20])) % 1000}"
                        request.clerk_user_id = stable_id
                        request.clerk_user = {'sub': stable_id}
                        logger.info(f"Search with fallback user: {request.clerk_user_id}")
            return self.get_response(request)

        logger.info(f"ClerkJWTMiddleware processing request to: {request.path}")

        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        logger.info(f"Authorization header present: {bool(auth_header)}")

        if not auth_header.startswith('Bearer '):
            if self._requires_auth(request.path):
                logger.warning(f"Missing or invalid Authorization header for {request.path}")
                return JsonResponse({'error': 'Authentication required'}, status=401)
            return self.get_response(request)

        token = auth_header.split(' ')[1]
        logger.info(f"Extracted token length: {len(token) if token else 0}, path: {request.path}")

        try:
            user_info = self._verify_token(token)
            logger.info(f"Token verification result: {bool(user_info)}, path: {request.path}")

            if user_info:
                request.clerk_user_id = user_info.get('sub')
                request.clerk_user = user_info
                logger.info(f"Authenticated user: {request.clerk_user_id} for path: {request.path}")
            else:
                logger.warning(f"Token verification failed for {request.path}")
                if self._requires_auth(request.path):
                    return JsonResponse({'error': 'Invalid authentication token'}, status=401)

        except Exception as e:
            logger.error(f"JWT verification error: {str(e)}")
            if self._requires_auth(request.path):
                return JsonResponse({'error': 'Token verification failed'}, status=401)

        return self.get_response(request)

    def _should_skip_auth(self, path: str) -> bool:
        # Specific paths that should skip auth (public endpoints)
        if path == '/api/docs/':
            return True
        if path == '/api/search/':
            return True
        # All other paths should be checked for auth
        return False

    def _requires_auth(self, path: str) -> bool:
        # Enforce authentication for protected endpoints
        auth_paths = [
            '/api/docs/upload/',
            '/api/docs/user/',
            '/api/favorites/',
        ]
        # Check for document deletion pattern
        if '/api/docs/' in path and '/delete/' in path:
            return True
            
        result = any(path.startswith(auth_path) for auth_path in auth_paths)
        logger.info(f"_requires_auth for {path}: {result}")
        return result

    def _verify_token(self, token: str) -> dict | None:
        if not self.clerk_secret_key:
            logger.warning("CLERK_SECRET_KEY not set, using fallback authentication")
            if token and len(token) > 10:
                stable_id = f"dev_user_{abs(hash(token[:20])) % 1000}"
                return {
                    'sub': stable_id,
                    'email': 'dev@example.com'
                }
            return None

        try:
            # Try RS256 first
            try:
                decoded_token = jwt.decode(
                    token,
                    self.clerk_secret_key,
                    algorithms=['RS256'],
                    options={"verify_exp": True, "verify_signature": False}
                )
                return decoded_token
            except jwt.InvalidTokenError:
                decoded_token = jwt.decode(
                    token,
                    self.clerk_secret_key,
                    algorithms=['HS256'],
                    options={"verify_exp": True}
                )
                return decoded_token

        except jwt.ExpiredSignatureError:
            logger.warning("JWT token has expired")
            return None
        except jwt.InvalidTokenError as e:
            logger.warning(f"Invalid JWT token: {str(e)}")
            return None
        except Exception as e:
            logger.error(f"JWT verification error: {str(e)}")
            return None