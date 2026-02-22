import os
from typing import Optional, Dict, Any

# ✅ NEW IMPORTS for the Dependency Logic
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from supabase import Client
from services.supabase_client import get_client
from utils_others.logger import logger


class AuthService:
    """
    Clean, production-ready authentication service.
    Handles:
        - Login
        - Registration
        - Password reset
        - Password update
        - Metadata consistency
    """

    def __init__(self, client: Optional[Client] = None) -> None:
        self.supabase = client or get_client()
        self.frontend_url = os.getenv("FRONTEND_BASE_URL", "https://login.skreenit.com")

    # ---------------------------------------------------------
    # LOGIN
    # ---------------------------------------------------------
    def login(self, email: str, password: str) -> Dict[str, Any]:
        try:
            res = self.supabase.auth.sign_in_with_password({
                "email": email,
                "password": password,
            })

            session = getattr(res, "session", None)
            user = getattr(res, "user", None)

            if not session or not user:
                raise ValueError("Invalid credentials")

            metadata = user.user_metadata or {}

            logger.info("User login successful", extra={"email": email})

            return {
                "ok": True,
                "access_token": session.access_token,
                "refresh_token": session.refresh_token,
                "user": {
                    "id": user.id,
                    "email": user.email,
                    "role": metadata.get("role"),
                    "full_name": metadata.get("full_name"),
                    "mobile": metadata.get("mobile"),
                    "location": metadata.get("location"),
                    "company_id": metadata.get("company_id"),
                    "company_name": metadata.get("company_name"),
                    "onboarded": metadata.get("onboarded", False),
                    "password_set": metadata.get("password_set", True),
                }
            }

        except Exception as e:
            logger.error(f"Login failed: {str(e)}", extra={"email": email})
            raise ValueError("Invalid email or password")

    # ---------------------------------------------------------
    # REGISTER
    # ---------------------------------------------------------
    def register(
        self,
        full_name: str,
        email: str,
        password: str,
        mobile: str,
        location: str,
        role: str,
        email_redirect_to: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Register a new user.
        """
        try:
            # Check for redirect URL (Handle None case)
            redirect_to = email_redirect_to or f"{self.frontend_url}/confirm-email"
            
            # 🔍 DEBUG: Print what we are sending to Supabase
            print(f"🔹 SERVICE: Registering {email} | Mobile: {mobile} | Role: {role}")

            auth_res = self.supabase.auth.sign_up({
                "email": email,
                "password": password,
                "options": {
                    "email_redirect_to": redirect_to,
                    "data": {
                        "full_name": full_name,
                        "mobile": mobile,
                        "location": location,
                        "role": role,
                        "onboarded": False,
                        "password_set": True,
                    }
                }
            })

            user = getattr(auth_res, "user", None)
            session = getattr(auth_res, "session", None)

            # Supabase sometimes returns a user but no session if email confirmation is on. 
            # That is OK.
            if not user:
                raise ValueError("Supabase returned no user object.")

            metadata = user.user_metadata or {}
            logger.info("User registered successfully", extra={"email": email})

            return {
                "ok": True,
                "access_token": session.access_token if session else None,
                "refresh_token": session.refresh_token if session else None,
                "user": {
                    "id": user.id,
                    "email": user.email,
                    "role": metadata.get("role"),
                    "full_name": metadata.get("full_name"),
                    "mobile": metadata.get("mobile"),
                    "location": metadata.get("location"),
                    "onboarded": False,
                    "password_set": True,
                }
            }

        except Exception as e:
            # 🔥 CRITICAL FIX: Raise the original error so we can see it!
            print(f"❌ AUTH SERVICE ERROR: {str(e)}") 
            
            msg = str(e).lower()
            if "already registered" in msg or "already exists" in msg:
                raise ValueError("This email is already registered")
            
            # Raise 'e' directly so the Router sees "AuthApiError: Password too short"
            raise e

    # ---------------------------------------------------------
    # UPDATE PASSWORD
    # ---------------------------------------------------------
    def update_password(self, user: dict, new_password: str) -> None:
        try:
            user_id = user["id"]
            metadata = user.get("user_metadata", {})

            self.supabase.auth.admin.update_user_by_id(
                user_id=user_id,
                attributes={
                    "password": new_password,
                    "user_metadata": {
                        **metadata,
                        "onboarded": True,
                        "password_set": True
                    }
                }
            )

            logger.info("Password updated", extra={"user_id": user_id})

        except Exception as e:
            logger.error(f"Password update failed: {str(e)}")
            raise RuntimeError("Failed to update password")

    # ---------------------------------------------------------
    # SEND PASSWORD RESET EMAIL
    # ---------------------------------------------------------
    def send_password_reset(self, email: str) -> None:
        try:
            redirect_to = f"{self.frontend_url}/update-password.html"
            self.supabase.auth.reset_password_email(email, {"redirect_to": redirect_to})

            logger.info("Password reset email sent", extra={"email": email})

        except Exception as e:
            logger.error(f"Password reset failed: {str(e)}")
            raise RuntimeError("Failed to send password reset email")


# =========================================================
# ✅ NEW: DEPENDENCY FUNCTION (Must be outside the class)
# =========================================================
security = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    Validates the Bearer Token sent by the frontend.
    Returns a dictionary with user info if valid.
    """
    token = credentials.credentials
    supabase = get_client()
    
    try:
        # 1. Ask Supabase if this token is valid
        user_response = supabase.auth.get_user(token)
        
        if not user_response or not user_response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, 
                detail="Invalid authentication credentials"
            )
        
        user = user_response.user
        
        # 2. Return the User Data as a Dictionary
        return {
            "user_id": user.id,
            "email": user.email,
            "role": user.user_metadata.get("role", "candidate"),
            "full_name": user.user_metadata.get("full_name", "")
        }
        
    except Exception as e:
        print(f"❌ Auth Error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Session expired or invalid"
        )

async def get_current_user(request: Request):
    user = getattr(request.state, "user", None)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    return user