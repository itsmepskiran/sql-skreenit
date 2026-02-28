import os
import jwt
import bcrypt
import secrets
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from services.mysql_service import UserService
from utils_others.logger import logger

class AuthService:
    """
    Custom Authentication Service that replaces Supabase auth.
    Handles:
        - JWT token generation and validation
        - Password hashing and verification
        - User registration and login
        - Session management
    """

    def __init__(self):
        self.user_service = UserService()
        self.jwt_secret = os.getenv("JWT_SECRET_KEY", "your-super-secret-jwt-key-change-in-production")
        self.jwt_algorithm = os.getenv("JWT_ALGORITHM", "HS256")
        self.access_token_expire_minutes = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", 30))
        self.refresh_token_expire_days = int(os.getenv("JWT_REFRESH_TOKEN_EXPIRE_DAYS", 7))

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
        """Generate JWT access and refresh tokens."""
        now = datetime.utcnow()
        
        # Access token payload
        access_payload = {
            "sub": user_data["id"],
            "email": user_data["email"],
            "role": user_data.get("role", "candidate"),
            "full_name": user_data.get("full_name", ""),
            "type": "access",
            "iat": now,
            "exp": now + timedelta(minutes=self.access_token_expire_minutes)
        }
        
        # Refresh token payload
        refresh_payload = {
            "sub": user_data["id"],
            "email": user_data["email"],
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
        """Register a new user with custom auth."""
        try:
            # Check if user already exists
            existing_user = self.user_service.get_user_by_email(email)
            if existing_user:
                raise ValueError("This email is already registered")

            # Hash password
            hashed_password = self._hash_password(password)

            # Create user in MySQL
            user_data = {
                "email": email,
                "full_name": full_name,
                "password": hashed_password,
                "phone": mobile,
                "location": location,
                "role": role,
                "onboarded": False,
                "email_verified": False,
                "created_at": datetime.utcnow().isoformat()
            }

            created_user = self.user_service.create_user(user_data)
            if not created_user:
                raise ValueError("Failed to create user")

            # Generate tokens
            tokens = self._generate_tokens(created_user)

            # Send confirmation email
            try:
                from utils_others.resend_email import send_email
                from utils_others.logger import logger
                
                confirmation_link = f"{email_redirect_to}?token={tokens['access_token']}&email={email}"
                html_content = f"""
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center;">
                        <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to Skreenit!</h1>
                        <p style="color: white; margin: 20px 0; font-size: 16px;">
                            Hi {full_name},<br><br>
                            Thank you for registering! Please click the button below to confirm your email address and activate your account.
                        </p>
                        <a href="{confirmation_link}" style="display: inline-block; background: white; color: #667eea; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0;">
                            Confirm Email Address
                        </a>
                        <p style="color: white; margin: 20px 0 0; font-size: 14px; opacity: 0.8;">
                            This link will expire in 24 hours. If you didn't create this account, you can safely ignore this email.
                        </p>
                    </div>
                    <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
                        <p>&copy; 2026 Skreenit. All rights reserved.</p>
                    </div>
                </div>
                """
                
                # Check if RESEND_API_KEY is configured
                import os
                resend_api_key = os.getenv("RESEND_API_KEY")
                if resend_api_key and resend_api_key.strip() and resend_api_key != "your_resend_api_key_here":
                    send_email(
                        to=email,
                        subject="Confirm your Skreenit account",
                        html=html_content,
                        email_type="confirmation"
                    )
                    logger.info(f"Confirmation email sent to {email}")
                else:
                    logger.warning(f"RESEND_API_KEY not configured. Email not sent to {email}")
                    # For development: Log the confirmation link
                    print(f"\n📧 DEVELOPMENT MODE - Email Confirmation Link:")
                    print(f"Confirmation Link: {confirmation_link}")
                    print(f"Token: {tokens['access_token']}")
                    print(f"Email: {email}")
                
            except Exception as e:
                logger.error(f"Failed to send confirmation email: {str(e)}")
                # Continue with registration even if email fails

            logger.info("User registered successfully", extra={"email": email})

            return {
                "ok": True,
                "data": {
                    "user": {
                        "id": created_user["id"],
                        "email": created_user["email"],
                        "role": created_user["role"],
                        "full_name": created_user["full_name"],
                        "mobile": created_user["phone"],
                        "onboarded": created_user["onboarded"],
                        "email_verified": created_user["email_verified"]
                    },
                    "access_token": tokens["access_token"],
                    "refresh_token": tokens["refresh_token"],
                    "message": "Registration successful! Please check your email to verify your account."
                }
            }

        except Exception as e:
            logger.error(f"Registration failed: {str(e)}", extra={"email": email})
            raise ValueError(str(e))

    def login(self, email: str, password: str) -> Dict[str, Any]:
        """Authenticate user with custom auth."""
        try:
            # Get user from database
            user = self.user_service.get_user_by_email(email)
            if not user:
                raise ValueError("Invalid email or password")

            # Verify password
            if not self._verify_password(password, user["password"]):
                raise ValueError("Invalid email or password")

            # Generate tokens
            tokens = self._generate_tokens(user)

            # Update last login
            self.user_service.update_last_login(user["id"])

            logger.info("User login successful", extra={"email": email})

            return {
                "ok": True,
                "access_token": tokens["access_token"],
                "refresh_token": tokens["refresh_token"],
                "user": {
                    "id": user["id"],
                    "email": user["email"],
                    "role": user["role"],
                    "full_name": user["full_name"],
                    "mobile": user["phone"],
                    "onboarded": user["onboarded"],
                    "email_verified": user["email_verified"]
                }
            }

        except ValueError:
            raise
        except Exception as e:
            logger.error(f"Login failed: {str(e)}", extra={"email": email})
            raise ValueError("Invalid email or password")

    def verify_token(self, token: str) -> Dict[str, Any]:
        """Verify JWT token and return user data."""
        try:
            payload = jwt.decode(token, self.jwt_secret, algorithms=[self.jwt_algorithm])
            
            # Check if token type is access
            if payload.get("type") != "access":
                raise ValueError("Invalid token type")
            
            # Get user from database
            user = self.user_service.get_user(payload["sub"])
            if not user:
                raise ValueError("User not found")
            
            return {
                "user_id": user["id"],
                "email": user["email"],
                "role": user["role"],
                "full_name": user["full_name"],
                "phone": user["phone"],
                "location": user["location"],
                "onboarded": user["onboarded"]
            }

        except jwt.ExpiredSignatureError:
            raise ValueError("Token has expired")
        except jwt.InvalidTokenError:
            raise ValueError("Invalid token")
        except Exception as e:
            logger.error(f"Token verification failed: {str(e)}")
            raise ValueError("Invalid token")

    def refresh_access_token(self, refresh_token: str) -> Dict[str, str]:
        """Generate new access token from refresh token."""
        try:
            payload = jwt.decode(refresh_token, self.jwt_secret, algorithms=[self.jwt_algorithm])
            
            # Check if token type is refresh
            if payload.get("type") != "refresh":
                raise ValueError("Invalid refresh token")
            
            # Get user from database
            user = self.user_service.get_user(payload["sub"])
            if not user:
                raise ValueError("User not found")
            
            # Generate new tokens
            tokens = self._generate_tokens(user)
            
            return {
                "access_token": tokens["access_token"],
                "refresh_token": tokens["refresh_token"]
            }

        except jwt.ExpiredSignatureError:
            raise ValueError("Refresh token has expired")
        except jwt.InvalidTokenError:
            raise ValueError("Invalid refresh token")
        except Exception as e:
            logger.error(f"Token refresh failed: {str(e)}")
            raise ValueError("Failed to refresh token")

    def update_password(self, user_id: str, new_password: str) -> None:
        """Update user password."""
        try:
            hashed_password = self._hash_password(new_password)
            success = self.user_service.update_user_password(user_id, hashed_password)
            
            if not success:
                raise ValueError("Failed to update password")
            
            logger.info("Password updated successfully", extra={"user_id": user_id})

        except Exception as e:
            logger.error(f"Password update failed: {str(e)}", extra={"user_id": user_id})
            raise ValueError("Failed to update password")

    def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user by ID."""
        return self.user_service.get_user(user_id)


# FastAPI Dependency
security = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict[str, Any]:
    """
    FastAPI dependency to get current authenticated user.
    Validates the Bearer Token and returns user info.
    """
    token = credentials.credentials
    auth_service = CustomAuthService()
    
    try:
        user_data = auth_service.verify_token(token)
        return user_data
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Authentication error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed"
        )

def get_current_user_optional(request) -> Optional[Dict[str, Any]]:
    """
    Optional authentication - returns user if authenticated, None otherwise.
    """
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return None
    
    try:
        token = auth_header.split(" ")[1]
        auth_service = CustomAuthService()
        return auth_service.verify_token(token)
    except Exception:
        return None
