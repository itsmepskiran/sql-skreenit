import traceback
import os
from fastapi import APIRouter, Request, HTTPException, Form
from typing import Optional

from models.auth_models import LoginRequest
from services.auth_service import AuthService
from services.mysql_service import UserService, ValidationError, DuplicateUserError, DatabaseError
from utils_others.logger import logger

router = APIRouter(tags=["Authentication"])
_auth_service: Optional[AuthService] = None
_user_service: Optional[UserService] = None

def create_error_response(detail: str, status_code: int = 400):
    """Helper to create consistent error responses."""
    raise HTTPException(status_code=status_code, detail=detail)

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
            create_error_response("Email and password are required")
        
        # Authenticate with custom auth service
        result = auth_service.login(email, password)
        
        logger.info(
            "User logged in successfully",
            extra={"request_id": getattr(request.state, "request_id", None)}
        )

        return {"ok": True, "data": result}

    except ValueError as e:
        logger.error(
            f"Login failed: {str(e)}",
            extra={"request_id": getattr(request.state, "request_id", None)}
        )
        create_error_response("Invalid email or password", 401)
    except Exception as e:
        logger.error(
            f"Login failed: {str(e)}",
            extra={"request_id": getattr(request.state, "request_id", None)}
        )
        create_error_response("Login failed. Please try again.", 500)

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
    """Register a new user with custom authentication - accepts JSON."""
    try:
        # Parse JSON body
        body = await request.json()
        
        # Extract fields
        full_name = body.get("full_name", "").strip()
        email = body.get("email", "").strip().lower()
        password = body.get("password", "").strip()
        mobile = body.get("mobile", "").strip()
        location = body.get("location", "").strip()
        role = body.get("role", "").strip()
        email_redirect_to = body.get("email_redirect_to")
        
        logger.info(f"Registration attempt for email: {email}", extra={
            "request_id": getattr(request.state, "request_id", None)
        })
        
        # Validate required fields
        if not all([full_name, email, password, mobile, location, role]):
            missing = [k for k, v in [("full_name", full_name), ("email", email), 
                       ("password", password), ("mobile", mobile), ("location", location), 
                       ("role", role)] if not v]
            create_error_response(f"Missing fields: {', '.join(missing)}")
        
        auth_service = get_auth_service()
        
        result = await auth_service.register(
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

    except ValidationError as e:
        logger.error(f"Registration validation failed: {str(e)}")
        create_error_response(f"Validation error: {str(e)}", 400)
    except DuplicateUserError as e:
        logger.error(f"Registration failed - duplicate user: {str(e)}")
        create_error_response("Email already registered", 409)
    except DatabaseError as e:
        logger.error(f"Registration database error: {str(e)}")
        create_error_response("Registration failed. Please try again.", 500)
    except Exception as e:
        logger.error(f"Registration failed: {str(e)}")
        create_error_response("Registration failed. Please try again.", 500)

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
            create_error_response("Missing token or email")
        
        # Verify token and update user
        auth_service = get_auth_service()
        
        # Verify token using centralized auth service
        payload = auth_service.verify_confirmation_token(token)
        
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
            create_error_response("Invalid token or user not found")
            
    except ValueError as e:
        logger.error(f"Email confirmation failed: {str(e)}")
        create_error_response(str(e))
    except Exception as e:
        logger.error(f"Email confirmation failed: {str(e)}")
        create_error_response("Email confirmation failed")


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
