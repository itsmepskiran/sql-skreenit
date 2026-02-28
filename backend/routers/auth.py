import traceback
import os
from fastapi import APIRouter, Request, HTTPException, Form
from typing import Optional

from models.auth_models import LoginRequest
from services.auth_service import AuthService
from services.mysql_service import UserService
from utils_others.logger import logger

router = APIRouter(tags=["Authentication"])
_auth_service: Optional[AuthService] = None
_user_service: Optional[UserService] = None

def get_auth_service() -> AuthService:
    """Get custom auth service instance."""
    global _auth_service
    if _auth_service is None:
        _auth_service = AuthService()
    return _auth_service

def get_user_service() -> UserService:
    """Get user service instance."""
    global _user_service
    if _user_service is None:
        _user_service = UserService()
    return _user_service

# ---------------------------------------------------------
# LOGIN
# ---------------------------------------------------------
@router.post("/login")
async def login(request: Request):
    """Login user with custom authentication - accepts JSON body."""
    auth_service = get_auth_service()
    user_service = get_user_service()
    
    try:
        # Parse JSON body
        body = await request.json()
        email = body.get("email", "").strip()
        password = body.get("password", "").strip()
        
        if not email or not password:
            raise ValueError("Email and password are required")
        
        # Authenticate with custom auth service
        result = auth_service.login(email, password)
        
        logger.info(
            "User logged in successfully",
            extra={"request_id": getattr(request.state, "request_id", None)}
        )

        return {"ok": True, "data": result}

    except Exception as e:
        logger.error(
            f"Login failed: {str(e)}",
            extra={"request_id": getattr(request.state, "request_id", None)}
        )
        raise HTTPException(status_code=401, detail=str(e))

# ---------------------------------------------------------
# GET CURRENT USER
# ---------------------------------------------------------
@router.get("/me")
async def get_current_user_me(request: Request):
    """Get current authenticated user data."""
    auth_service = get_auth_service()
    
    try:
        # Get user from request state (set by middleware)
        user = getattr(request.state, "user", None)
        if not user:
            raise HTTPException(status_code=401, detail="Authentication required")
        
        # Get full user data from database
        user_service = get_user_service()
        full_user = user_service.get_user(user["user_id"])
        if not full_user:
            raise HTTPException(status_code=404, detail="User not found")
        
        logger.info("Current user fetched", extra={"user_id": user["user_id"]})
        return {"ok": True, "data": full_user}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get current user: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch user data")

# ---------------------------------------------------------
# MARK USER AS ONBOARDED
# ---------------------------------------------------------
@router.post("/mark-onboarded")
async def mark_onboarded(request: Request):
    """Mark user as onboarded after completing profile setup."""
    user = getattr(request.state, "user", None)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    try:
        user_service = get_user_service()
        success = user_service.mark_as_onboarded(user["user_id"])
        
        if not success:
            raise HTTPException(status_code=404, detail="User not found")
        
        logger.info("User marked as onboarded", extra={"user_id": user["user_id"]})
        return {"ok": True, "message": "User onboarded successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to mark user as onboarded: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update onboarding status")

# ---------------------------------------------------------
# REGISTER
# ---------------------------------------------------------
@router.post("/register")
async def register(request: Request):
    """Register a new user with custom authentication - accepts FormData."""
    print(f"\n📨 REGISTER ENDPOINT HIT")
    print(f"   Content-Type: {request.headers.get('content-type')}")
    
    try:
        # Parse FormData manually
        form_data = await request.form()
        print(f"   Form fields: {list(form_data.keys())}")
        
        # Extract fields
        full_name = form_data.get("full_name", "").strip()
        email = form_data.get("email", "").strip().lower()
        password = form_data.get("password", "").strip()
        mobile = form_data.get("mobile", "").strip()
        location = form_data.get("location", "").strip()
        role = form_data.get("role", "").strip()
        email_redirect_to = form_data.get("email_redirect_to")
        
        print(f"   Email: {email}")
        print(f"   Full Name: {full_name}")
        print(f"   Mobile: {mobile}")
        print(f"   Location: {location}")
        print(f"   Role: {role}")
        
        # Validate required fields
        if not all([full_name, email, password, mobile, location, role]):
            missing = [k for k, v in [("full_name", full_name), ("email", email), 
                       ("password", password), ("mobile", mobile), ("location", location), 
                       ("role", role)] if not v]
            raise ValueError(f"Missing fields: {', '.join(missing)}")
        
        auth_service = get_auth_service()
        
        result = auth_service.register(
            full_name=full_name, 
            email=email, 
            password=password, 
            mobile=mobile, 
            location=location, 
            role=role,
            email_redirect_to=email_redirect_to
        )
        
        logger.info(
            "User registered successfully",
            extra={"request_id": getattr(request.state, "request_id", None)}
        )

        return {"ok": True, "data": result}

    except Exception as e:
        # 🔥 PRINT THE REAL ERROR TO TERMINAL
        print(f"\n❌ REGISTRATION CRASHED: {str(e)}")
        traceback.print_exc() 
        
        logger.error(f"Registration failed: {str(e)}")
        
        # Return the REAL error message to frontend
        raise HTTPException(status_code=400, detail=str(e))

# ---------------------------------------------------------
# UPDATE PASSWORD
# ---------------------------------------------------------
@router.post("/update-password")
async def update_password(request: Request, new_password: str = Form(...)):
    """Update user password."""
    user = getattr(request.state, "user", None)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")

    try:
        auth_service = get_auth_service()
        auth_service.update_password(user["user_id"], new_password)
        return {"ok": True, "message": "Password updated successfully"}

    except Exception as e:
        logger.error(f"Password update failed: {str(e)}")
        raise HTTPException(status_code=400, detail="Failed to update password")

# ---------------------------------------------------------
# CONFIRM EMAIL
# ---------------------------------------------------------
@router.post("/confirm-email")
async def confirm_email(request: Request):
    """Confirm user email address."""
    try:
        # Parse form data
        form_data = await request.form()
        token = form_data.get("token", "").strip()
        email = form_data.get("email", "").strip().lower()
        
        if not token or not email:
            raise ValueError("Missing token or email")
        
        # Verify token and update user
        auth_service = get_auth_service()
        
        try:
            # Decode and verify token
            import jwt
            from dotenv import load_dotenv
            import os
            BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            load_dotenv(os.path.join(BASE_DIR, ".env"))
            
            payload = jwt.decode(
                token, 
                os.getenv("JWT_SECRET_KEY"), 
                algorithms=[os.getenv("JWT_ALGORITHM", "HS256")]
            )
            
            # Update user email confirmation
            user_service = get_user_service()
            user = user_service.get_user_by_email(email)
            
            if user and not user.get("email_confirmed_at"):
                # Mark email as confirmed
                user_service.update_user_email_confirmed(user["id"])
                logger.info(f"Email confirmed for user: {email}")
                
                # Get updated user data with role
                updated_user = user_service.get_user_by_email(email)
                
                return {
                    "ok": True,
                    "message": "Email confirmed successfully! You can now login to your account.",
                    "data": {
                        "user": {
                            "id": updated_user["id"],
                            "email": updated_user["email"],
                            "role": updated_user["role"],
                            "full_name": updated_user["full_name"],
                            "mobile": updated_user["phone"],
                            "onboarded": updated_user["onboarded"],
                            "email_verified": True
                        }
                    }
                }
            elif user and user.get("email_confirmed_at"):
                return {
                    "ok": True,
                    "message": "Email already confirmed. You can login to your account."
                }
            else:
                raise ValueError("Invalid token or user not found")
                
        except jwt.ExpiredSignatureError:
            raise ValueError("Confirmation link has expired")
        except jwt.InvalidTokenError:
            raise ValueError("Invalid confirmation link")
            
    except Exception as e:
        logger.error(f"Email confirmation failed: {str(e)}")
        raise ValueError(str(e))


# ---------------------------------------------------------
# FORGOT PASSWORD
# ---------------------------------------------------------
@router.post("/forgot-password")
async def forgot_password(request: Request, email: str = Form(...)):
    """Handle forgot password request."""
    try:
        # For now, just return success to avoid email enumeration
        # In a real implementation, you would send a password reset email
        logger.info(f"Password reset requested for email: {email}")
        return {"ok": True, "message": "If an account exists, a reset link has been sent"}

    except Exception:
        # Always return success to avoid email enumeration
        return {"ok": True, "message": "If an account exists, a reset link has been sent"}

# ---------------------------------------------------------
# REFRESH TOKEN
# ---------------------------------------------------------
@router.post("/refresh-token")
async def refresh_token(request: Request, refresh_token: str = Form(...)):
    """Refresh access token using refresh token."""
    try:
        auth_service = get_auth_service()
        tokens = auth_service.refresh_access_token(refresh_token)
        
        return {"ok": True, "data": tokens}

    except Exception as e:
        logger.error(f"Token refresh failed: {str(e)}")
        raise HTTPException(status_code=401, detail=str(e))

# ---------------------------------------------------------
# LOGOUT
# ---------------------------------------------------------
@router.post("/logout")
async def logout(request: Request):
    """Logout user (client-side token removal)."""
    user = getattr(request.state, "user", None)
    if user:
        logger.info(f"User logged out", extra={"user_id": user["user_id"]})
    
    return {"ok": True, "message": "Logged out successfully"}
