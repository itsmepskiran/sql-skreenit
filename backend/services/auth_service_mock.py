"""
Mock Authentication Service for Local Development
When Supabase is unreachable, this stubs out auth responses
"""

import os
import uuid
from typing import Optional, Dict, Any
from datetime import datetime
from utils_others.logger import logger


class MockAuthService:
    """
    Development-only mock auth service that simulates Supabase without network calls.
    Use this when you can't reach actual Supabase servers.
    """

    def __init__(self) -> None:
        self.frontend_url = os.getenv("FRONTEND_BASE_URL", "https://login.skreenit.com")
        # Simple in-memory store for mock users (resets on restart)
        self.mock_users = {}

    # ---------------------------------------------------------
    # LOGIN - MOCK
    # ---------------------------------------------------------
    def login(self, email: str, password: str) -> Dict[str, Any]:
        """Mock login - checks if user was registered in this session."""
        email = email.lower().strip()
        
        # Check if user was registered in current mock session
        if email not in self.mock_users:
            raise ValueError("User not found in development mock store")
        
        user_data = self.mock_users[email]
        
        # Simple password check (in real Supabase, this is hashed)
        if user_data.get("password") != password:
            raise ValueError("Invalid password")
        
        # Generate mock tokens
        access_token = f"mock_token_{uuid.uuid4()}"
        refresh_token = f"mock_refresh_{uuid.uuid4()}"
        
        logger.info("Mock login successful", extra={"email": email})
        
        return {
            "ok": True,
            "access_token": access_token,
            "refresh_token": refresh_token,
            "user": {
                "id": user_data["id"],
                "email": user_data["email"],
                "role": user_data.get("role"),
                "full_name": user_data.get("full_name"),
                "mobile": user_data.get("mobile"),
                "location": user_data.get("location"),
                "company_id": user_data.get("company_id"),
                "company_name": user_data.get("company_name"),
                "onboarded": user_data.get("onboarded", False),
                "password_set": True,
            }
        }

    # ---------------------------------------------------------
    # REGISTER - MOCK
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
        Mock register - stores user in memory.
        In real app, Supabase would send email, verify, etc.
        """
        email = email.lower().strip()
        
        # Check if already registered
        if email in self.mock_users:
            raise ValueError(f"User {email} already registered in this session")
        
        # Generate mock user ID (like Supabase would)
        user_id = f"mock_user_{uuid.uuid4()}"
        
        # Store user in memory
        self.mock_users[email] = {
            "id": user_id,
            "email": email,
            "password": password,  # Never do this in real code!
            "full_name": full_name,
            "mobile": mobile,
            "location": location,
            "role": role,
            "onboarded": False,
            "created_at": datetime.now().isoformat()
        }
        
        # Generate mock tokens
        access_token = f"mock_token_{uuid.uuid4()}"
        refresh_token = f"mock_refresh_{uuid.uuid4()}"
        
        logger.info("Mock registration successful", extra={"email": email})
        
        return {
            "ok": True,
            "access_token": access_token,
            "refresh_token": refresh_token,
            "user": {
                "id": user_id,
                "email": email,
                "role": role,
                "full_name": full_name,
                "mobile": mobile,
                "location": location,
                "onboarded": False,
                "password_set": True,
            }
        }

    def update_password(self, user: Dict[str, Any], new_password: str) -> None:
        """Mock password update."""
        email = user.get("email")
        if email in self.mock_users:
            self.mock_users[email]["password"] = new_password
            logger.info("Mock password updated", extra={"email": email})
        else:
            raise ValueError("User not found")

    def send_password_reset(self, email: str) -> None:
        """Mock password reset - just logs it."""
        logger.info("Mock password reset requested", extra={"email": email})
