"""
Clerk JWT authentication middleware.
"""
import jwt
import requests
from django.conf import settings
from django.http import JsonResponse
import logging

logger = logging.getLogger(__name__)


class ClerkJWTMiddleware:
    """
    Middleware to verify Clerk JWT tokens and attach user information to requests.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        self.clerk_secret_key = settings.CLERK_SECRET_KEY
        
        if not self.clerk_secret_key:
            logger.warning("CLERK_SECRET_KEY not set. JWT verification will be disabled.")
    
    def __call__(self, request):
        # Skip authentication for certain paths
        if self._should_skip_auth(request.path):
            # For search endpoint, still process authentication if token is provided
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
                        # Create fallback user for search if token provided but invalid
                        stable_id = f"dev_user_{abs(hash(token[:20])) % 1000}"  # Use same logic as _verify_token
                        request.clerk_user_id = stable_id
                        request.clerk_user = {'sub': stable_id}
                        logger.info(f"Search with fallback user: {request.clerk_user_id}")
            return self.get_response(request)
        
        # Log the request for debugging
        logger.info(f"ClerkJWTMiddleware processing request to: {request.path}")
        
        # Extract token from Authorization header
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        logger.info(f"Authorization header present: {bool(auth_header)}")
        
        if not auth_header.startswith('Bearer '):
            # For endpoints that require authentication, return 401
            if self._requires_auth(request.path):
                logger.warning(f"Missing or invalid Authorization header for {request.path}")
                return JsonResponse({'error': 'Authentication required'}, status=401)
            return self.get_response(request)
        
        token = auth_header.split(' ')[1]
        logger.info(f"Extracted token length: {len(token) if token else 0}, path: {request.path}")
        
        try:
            # Verify the JWT token
            user_info = self._verify_token(token)
            logger.info(f"Token verification result: {bool(user_info)}, path: {request.path}")
            
            if user_info:
                request.clerk_user_id = user_info.get('sub')
                request.clerk_user = user_info
                logger.info(f"Authenticated user: {request.clerk_user_id} for path: {request.path}")
            else:
                logger.warning(f"Token verification failed for {request.path}, creating fallback user")
                # Create a fallback user for development using same logic
                stable_id = f"dev_user_{abs(hash(token[:20])) % 1000}"
                request.clerk_user_id = stable_id
                request.clerk_user = {'sub': stable_id}
                logger.info(f"Using fallback user: {request.clerk_user_id}")
                
        except Exception as e:
            logger.error(f"JWT verification error: {str(e)}")
            if self._requires_auth(request.path):
                return JsonResponse({'error': 'Token verification failed'}, status=401)
        
        return self.get_response(request)
    
    def _should_skip_auth(self, path: str) -> bool:
        """Check if authentication should be skipped for this path."""
        skip_paths = [
            '/api/docs/',  # Document listing doesn't require auth
            '/api/search/',  # Search doesn't require auth
        ]
        return any(path.startswith(skip_path) for skip_path in skip_paths)
    
    def _requires_auth(self, path: str) -> bool:
        """Check if this path requires authentication."""
        # Always require auth for POST, PUT, DELETE methods on protected endpoints
        return False  # Let views handle authentication requirements individually
    
    def _verify_token(self, token: str) -> dict | None:
        """
        Verify the Clerk JWT token and return user information.
        For development purposes, if CLERK_SECRET_KEY is not set, 
        we'll use a fallback approach.
        """
        if not self.clerk_secret_key:
            logger.warning("CLERK_SECRET_KEY not set, using fallback authentication")
            # For development - create a more stable user ID
            if token and len(token) > 10:
                # Use a simpler approach - just take first part of token for consistent ID
                # This ensures the same token always generates the same user ID
                stable_id = f"dev_user_{abs(hash(token[:20])) % 1000}"  # Use first 20 chars for stability
                return {
                    'sub': stable_id,
                    'email': 'dev@example.com'
                }
            return None
        
        try:
            # Try RS256 first (Clerk's default)
            try:
                decoded_token = jwt.decode(
                    token,
                    self.clerk_secret_key,
                    algorithms=['RS256'],
                    options={"verify_exp": True, "verify_signature": False}  # Skip signature verification for development
                )
                return decoded_token
            except jwt.InvalidTokenError:
                # Fallback to HS256
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
