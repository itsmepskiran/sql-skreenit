import os
import time
from typing import List, Union, Optional, Dict, Any
from utils_others.logger import logger


class EmailError(Exception):
    """Custom exception for email sending errors."""
    pass


def send_email(
    to: Union[str, List[str]],
    subject: str,
    html: str,
    text: Optional[str] = None,
    from_addr: Optional[str] = None,
    email_type: str = "default",
    reply_to: Optional[str] = None,
    retries: int = 2,
) -> Dict[str, Any]:
    """
    Sends an email using the Resend API.
    Raises EmailError on failure.
    """

    # ---------------------------------------------------------
    # Import Resend safely
    # ---------------------------------------------------------
    try:
        import resend
    except Exception as e:
        logger.error(f"Resend import failed: {str(e)}")
        raise EmailError(f"Resend import failed: {e}")

    # ---------------------------------------------------------
    # API Key
    # ---------------------------------------------------------
    api_key = os.getenv("RESEND_API_KEY")
    if not api_key:
        logger.error("Missing RESEND_API_KEY")
        raise EmailError("Missing RESEND_API_KEY")

    resend.api_key = api_key

    # ---------------------------------------------------------
    # Normalize recipients
    # ---------------------------------------------------------
    if isinstance(to, str):
        to = [to]

    if not to:
        raise EmailError("Recipient list cannot be empty")

    # ---------------------------------------------------------
    # Determine sender address
    # ---------------------------------------------------------
    if from_addr is None:
        senders = {
            "welcome": os.getenv("EMAIL_WELCOME", "welcome@skreenit.com"),
            "verification": os.getenv("EMAIL_VERIFICATION", "verification@skreenit.com"),
            "info": os.getenv("EMAIL_INFO", "info@skreenit.com"),
            "support": os.getenv("EMAIL_SUPPORT", "support@skreenit.com"),
            "noreply": os.getenv("EMAIL_NOREPLY", "do-not-reply@skreenit.com"),
            "default": os.getenv("EMAIL_FROM", "info@skreenit.com"),
        }
        from_addr = senders.get(email_type, senders["default"])

    # ---------------------------------------------------------
    # Validate required fields
    # ---------------------------------------------------------
    if not subject or not html:
        raise EmailError("Subject and HTML content are required")

    # ---------------------------------------------------------
    # Prepare payload
    # ---------------------------------------------------------
    payload = {
        "from": from_addr,
        "to": to,
        "subject": subject,
        "html": html,
        "text": text or "This is an HTML email. Please enable HTML view.",
    }

    if reply_to:
        payload["reply_to"] = reply_to

    # ---------------------------------------------------------
    # Retry logic for transient failures
    # ---------------------------------------------------------
    for attempt in range(retries + 1):
        try:
            response = resend.Emails.send(payload)

            # Normalize response
            if isinstance(response, dict):
                logger.info("Email sent successfully", extra={"to": to, "type": email_type})
                return response

            if hasattr(response, "__dict__"):
                logger.info("Email sent successfully", extra={"to": to, "type": email_type})
                return response.__dict__

            logger.info("Email sent successfully", extra={"to": to, "type": email_type})
            return {"status": "sent", "raw": str(response)}

        except Exception as e:
            logger.error(
                f"Email sending failed (attempt {attempt + 1}): {str(e)}",
                extra={"to": to, "subject": subject, "type": email_type},
            )

            if attempt < retries:
                time.sleep(1.0)  # small backoff
                continue

            raise EmailError(f"Email sending failed after retries: {e}")
