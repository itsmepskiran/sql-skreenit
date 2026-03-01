import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from utils_others.logger import logger

def send_email(to, subject, html, email_type="verification"):
    # 1. Configuration
    smtp_server = "smtp.hostinger.com"
    smtp_port = 465 # SSL
    sender_email = "support@skreenit.com"
    password = os.getenv("HOSTINGER_EMAIL_PASSWORD") 

    # 2. Build the Message
    msg = MIMEMultipart()
    msg["From"] = f"Skreenit Onboarding <{sender_email}>"
    msg["To"] = to if isinstance(to, str) else ", ".join(to)
    msg["Subject"] = subject
    msg.attach(MIMEText(html, "html"))

    # 3. Send via SMTP
    try:
        with smtplib.SMTP_SSL(smtp_server, smtp_port) as server:
            server.login(sender_email, password)
            server.send_message(msg)
        logger.info(f"Email sent successfully via Hostinger to {to}")
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Hostinger SMTP Error: {str(e)}")
        return {"status": "error", "message": str(e)}