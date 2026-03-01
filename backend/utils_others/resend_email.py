import os
import json
import time
from typing import List, Union, Optional, Dict, Any
from utils_others.logger import logger

class EmailError(Exception):
    """Custom exception for email sending errors."""
    pass

def send_email(
    to: Union[str, List[str]],
    subject: str,
    html: Optional[str] = None,
    text: Optional[str] = None,
    from_addr: Optional[str] = None,
    email_type: str = "default",
    reply_to: Optional[str] = None,
    retries: int = 2,
    template_id: Optional[str] = "email-confirmation-1", # Updated ID
    template_data: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    try:
        import resend
    except Exception as e:
        logger.error(f"Resend import failed: {str(e)}")
        raise EmailError(f"Resend import failed: {e}")

    api_key = os.getenv("RESEND_API_KEY")
    if not api_key:
        logger.error("Missing RESEND_API_KEY")
        raise EmailError("Missing RESEND_API_KEY")

    resend.api_key = api_key

    # ---------------------------------------------------------
    # Determine Sender
    # ---------------------------------------------------------
    senders = {
        "onboarding": os.getenv("EMAIL_ONBOARDING", "onboarding@skreenit.com"),
        "welcome": os.getenv("EMAIL_WELCOME", "welcome@skreenit.com"),
        "verification": os.getenv("EMAIL_VERIFICATION", "verification@skreenit.com"),
        "support": os.getenv("EMAIL_SUPPORT", "support@skreenit.com"),
        "default": os.getenv("EMAIL_FROM", "info@skreenit.com"),
    }
    
    display_names = {
        "onboarding": "Skreenit Onboarding",
        "welcome": "Skreenit Team",
        "verification": "Skreenit",
        "support": "Skreenit Support",
    }

    actual_from = from_addr or senders.get(email_type, senders["default"])
    display_name = display_names.get(email_type, "Skreenit")
    from_formatted = f"{display_name} <{actual_from}>"

    # ---------------------------------------------------------
    # Prepare Payload (THE FIX IS HERE)
    # ---------------------------------------------------------
    payload: Dict[str, Any] = {
        "from": from_formatted,
        "to": to,
        "subject": subject,
    }

    if template_id:
        payload["template"] = {
            "id": template_id,
            "variables": template_data or {}
        }
    else:
        # Standard HTML/Text fallback
        if html:
            payload["html"] = html
        if text:
            payload["text"] = text
        
        if not html and not text:
            raise EmailError("Either template_id or html/text must be provided")

    if reply_to:
        payload["reply_to"] = reply_to

    # ---------------------------------------------------------
    # Execution
    # ---------------------------------------------------------
    for attempt in range(retries + 1):
        try:
            logger.info(f"Attempting email send to: {to} using template: {template_id}")
            
            # Pass the dictionary directly to avoid Python 'from' keyword error
            response = resend.Emails.send(payload)

            if response:
                logger.info("Email sent successfully")
                # Normalize return value
                return response if isinstance(response, dict) else getattr(response, "__dict__", {"status": "success"})
            
            raise EmailError("Empty response from Resend")

        except Exception as e:
            error_msg = str(e)
            logger.error(f"Email sending failed (attempt {attempt + 1}): {error_msg}")

            if attempt < retries:
                time.sleep(1.0)
                continue
            
            raise EmailError(f"Email sending failed after {retries + 1} attempts: {error_msg}")