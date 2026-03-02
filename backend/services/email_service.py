# backend/services/email_service.py
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from utils_others.logger import logger
from utils_others.email_templates import EmailTemplates

class EmailService:
    def __init__(self):
        self.smtp_server = "smtp.hostinger.com"
        self.smtp_port = 587  # Try TLS instead of SSL
        self.base_email = "skreenit.com"
        self.password = os.getenv("HOSTINGER_EMAIL_PASSWORD")
        
        # Email aliases for different purposes
        self.email_aliases = {
            "verification": "verification@skreenit.com",
            "support": "support@skreenit.com", 
            "notifications": "notifications@skreenit.com",
            "noreply": "noreply@skreenit.com",
            "billing": "billing@skreenit.com",
            "jobs": "jobs@skreenit.com",
            "onboarding": "onboarding@skreenit.com",
        }
        
        # Sender names for different aliases
        self.sender_names = {
            "verification": "Skreenit Verification",
            "support": "Skreenit Support",
            "notifications": "Skreenit Notifications", 
            "noreply": "Skreenit System",
            "billing": "Skreenit Billing",
            "jobs": "Skreenit Jobs",
            "onboarding": "Skreenit Onboarding"
        }
    
    def get_sender_info(self, email_type):
        """Get sender email and display name based on email type"""
        sender_email = self.email_aliases.get(email_type, "support@skreenit.com")
        sender_name = self.sender_names.get(email_type, "Skreenit Support")
        return sender_email, sender_name
    
    async def send_verification_email(self, to_email, full_name, confirmation_url):
        """Send verification email using onboarding@skreenit.com"""
        try:
            # Use EmailTemplates class with welcome.html template
            email_templates = EmailTemplates()
            template_data = email_templates.registration_confirmation({
                "full_name": full_name,
                "email": to_email,
                "role": "candidate"
            })
            
            html_content = template_data["html"]
            sender_email, sender_name = self.get_sender_info("onboarding")
            
            msg = MIMEMultipart()
            msg["From"] = f"{sender_name} <{sender_email}>"
            msg["To"] = to_email
            msg["Subject"] = template_data["subject"]
            msg.attach(MIMEText(html_content, "html"))
            
            # Use main email for SMTP authentication, but send from alias
            auth_email = "support@skreenit.com"
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls()  # Start TLS encryption
                server.login(auth_email, self.password)
                server.send_message(msg)
            
            logger.info(f"Verification email sent from {sender_email} to {to_email}")
            return {"status": "success", "message": "Email sent successfully"}
            
        except Exception as e:
            logger.error(f"Failed to send verification email: {str(e)}")
            return {"status": "error", "message": str(e)}
    
    async def send_support_email(self, to_email, subject, content):
        """Send support email using support@skreenit.com"""
        try:
            sender_email, sender_name = self.get_sender_info("support")
            
            msg = MIMEMultipart()
            msg["From"] = f"{sender_name} <{sender_email}>"
            msg["To"] = to_email
            msg["Subject"] = subject
            msg.attach(MIMEText(content, "html"))
            
            # Use main email for SMTP authentication
            auth_email = "support@skreenit.com"
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls()  # Start TLS encryption
                server.login(auth_email, self.password)
                server.send_message(msg)
            
            logger.info(f"Support email sent from {sender_email} to {to_email}")
            return {"status": "success", "message": "Email sent successfully"}
            
        except Exception as e:
            logger.error(f"Failed to send support email: {str(e)}")
            return {"status": "error", "message": str(e)}
    
    async def send_notification_email(self, to_email, subject, content):
        """Send notification email using notifications@skreenit.com"""
        try:
            sender_email, sender_name = self.get_sender_info("notifications")
            
            msg = MIMEMultipart()
            msg["From"] = f"{sender_name} <{sender_email}>"
            msg["To"] = to_email
            msg["Subject"] = subject
            msg.attach(MIMEText(content, "html"))
            
            # Use main email for SMTP authentication
            auth_email = "support@skreenit.com"
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls()  # Start TLS encryption
                server.login(auth_email, self.password)
                server.send_message(msg)
            
            logger.info(f"Notification email sent from {sender_email} to {to_email}")
            return {"status": "success", "message": "Email sent successfully"}
            
        except Exception as e:
            logger.error(f"Failed to send notification email: {str(e)}")
            return {"status": "error", "message": str(e)}