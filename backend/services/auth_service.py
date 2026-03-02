import os
from unittest import result
import jwt
import bcrypt
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from services.mysql_service import UserService
from utils_others.logger import logger
from services.email_service import EmailService

class AuthService:
    """
    Custom Authentication Service replacing Supabase.
    Handles JWT, Password Hashing, and User Session Management.
    """

    def __init__(self):
        self.user_service = UserService()
        # Strictly pull from environment; validator in config.py handles missing keys
        self.jwt_secret = os.getenv("JWT_SECRET_KEY")
        self.jwt_algorithm = os.getenv("JWT_ALGORITHM", "HS256")
        self.access_token_expire_minutes = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", 30))
        self.refresh_token_expire_days = int(os.getenv("JWT_REFRESH_TOKEN_EXPIRE_DAYS", 7))
        self.email_service = EmailService()

    def _hash_password(self, password: str) -> str:
        """Hash password using bcrypt."""
        salt = bcrypt.gensalt()
        return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

    def _verify_password(self, password: str, hashed_password: str) -> bool:
        """Verify password against bcrypt hash."""
        try:
            return bcrypt.checkpw(password.encode('utf-8'), hashed_password.encode('utf-8'))
        except Exception:
            return False

    def _generate_tokens(self, user_data: Dict[str, Any]) -> Dict[str, str]:
        """Generate JWT access and refresh tokens including onboarding status."""
        now = datetime.utcnow()
        
        # Access token payload - Inclusion of 'onboarded' is critical for frontend redirects
        access_payload = {
            "sub": str(user_data["id"]),
            "email": user_data["email"],
            "role": user_data.get("role", "candidate"),
            "full_name": user_data.get("full_name", ""),
            "onboarded": user_data.get("onboarded", False),
            "type": "access",
            "iat": now,
            "exp": now + timedelta(minutes=self.access_token_expire_minutes)
        }
        
        refresh_payload = {
            "sub": str(user_data["id"]),
            "type": "refresh",
            "iat": now,
            "exp": now + timedelta(days=self.refresh_token_expire_days)
        }
        
        access_token = jwt.encode(access_payload, self.jwt_secret, algorithm=self.jwt_algorithm)
        refresh_token = jwt.encode(refresh_payload, self.jwt_secret, algorithm=self.jwt_algorithm)
        
        return {
            "access_token": access_token,
            "refresh_token": refresh_token
        }

    async def register(self, full_name: str, email: str, password: str, 
                 mobile: str, location: str, role: str, 
                 email_redirect_to: Optional[str] = None) -> Dict[str, Any]:
        """Register a new user and return user data with tokens."""
        try:
            existing_user = self.user_service.get_user_by_email(email)
            if existing_user:
                raise ValueError("This email is already registered")

            user_data = {
                "email": email,
                "full_name": full_name,
                "password": self._hash_password(password),
                "phone": mobile,
                "location": location,
                "role": role,
                "onboarded": False,
                "email_verified": False,
                "metadata": {"registration_source": "web", "onboarded": False}
            }

            created_user = self.user_service.create_user(user_data)
            if not created_user:
                raise ValueError("Failed to create user account")

            tokens = self._generate_tokens(created_user)

            # Verification email logic remains encapsulated here
            await self._send_verification_email(created_user, tokens['access_token'], email_redirect_to)

            return {
                "ok": True,
                "user": {
                    "id": created_user["id"],
                    "email": created_user["email"],
                    "role": created_user["role"],
                    "full_name": created_user["full_name"],
                    "onboarded": created_user["onboarded"]
                },
                "access_token": tokens["access_token"],
                "refresh_token": tokens["refresh_token"]
            }
        except Exception as e:
            logger.error(f"Registration failed for {email}: {str(e)}")
            raise ValueError(str(e))

    async def _send_verification_email(self, user, token, redirect_url):
        try:
            base_url = redirect_url or os.getenv("FRONTEND_BASE_URL") or "https://login.skreenit.com"
            confirmation_link = f"{base_url}/confirm-email.html?token={token}&email={user['email']}"
            full_name = user.get('full_name', 'User')
            
            # Send email using SMTP EmailService
            await self.email_service.send_verification_email(
                to_email=user['email'],
                full_name=full_name,
                confirmation_url=confirmation_link
            )
            
            logger.info(f"Verification email sent to {user['email']}")
            return {"ok": True, "message": "Verification email sent"}

        except Exception as e:
            logger.error(f"Failed to send verification email: {str(e)}")
            raise ValueError(str(e))

    def login(self, email: str, password: str) -> Dict[str, Any]:
        """Verify credentials and return user session."""
        user = self.user_service.get_user_for_auth(email)  # Use secure auth method
        if not user or not self._verify_password(password, user["password"]):
            raise ValueError("Invalid email or password")

        tokens = self._generate_tokens(user)
        self.user_service.update_last_login(user["id"])

        return {
            "ok": True,
            "access_token": tokens["access_token"],
            "refresh_token": tokens["refresh_token"],
            "user": {
                "id": user["id"],
                "email": user["email"],
                "role": user["role"],
                "onboarded": user["onboarded"]
            }
        }

    def verify_token(self, token: str) -> Dict[str, Any]:
        """Decode and validate a JWT access token."""
        try:
            payload = jwt.decode(token, self.jwt_secret, algorithms=[self.jwt_algorithm])
            if payload.get("type") != "access":
                raise ValueError("Invalid token type")
            
            return payload # Returns the decoded claims (sub, role, onboarded, etc.)
        except jwt.ExpiredSignatureError:
            raise ValueError("Token has expired")
        except jwt.InvalidTokenError:
            raise ValueError("Invalid token")

    def verify_confirmation_token(self, token: str) -> Dict[str, Any]:
        """Verify JWT token for email confirmation (no type check)."""
        try:
            payload = jwt.decode(
                token, 
                self.jwt_secret, 
                algorithms=[self.jwt_algorithm]
            )
            return payload
        except jwt.ExpiredSignatureError:
            raise ValueError("Confirmation token has expired")
        except jwt.InvalidTokenError:
            raise ValueError("Invalid confirmation token")

# FastAPI Dependency Setup
security = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict[str, Any]:
    """FastAPI dependency to inject the authenticated user into routes."""
    token = credentials.credentials
    auth_service = AuthService() # Corrected class name
    try:
        return auth_service.verify_token(token)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))