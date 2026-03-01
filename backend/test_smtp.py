#!/usr/bin/env python3
import os
import smtplib
from email.mime.text import MIMEText

def test_smtp_connection():
    """Test Hostinger SMTP connection"""
    try:
        # Configuration
        smtp_server = "smtp.hostinger.com"
        smtp_port = 465
        sender_email = "support@skreenit.com"
        password = os.getenv("HOSTINGER_EMAIL_PASSWORD")
        
        if not password:
            print("❌ HOSTINGER_EMAIL_PASSWORD not set in environment")
            return False
        
        print(f"🔐 Testing SMTP connection for {sender_email}")
        
        # Test connection
        with smtplib.SMTP_SSL(smtp_server, smtp_port) as server:
            server.login(sender_email, password)
            print("✅ SMTP authentication successful!")
            
            # Test send to yourself
            msg = MIMEText("Test email from Skreenit SMTP")
            msg["Subject"] = "SMTP Test - Skreenit"
            msg["From"] = f"Skreenit Test <{sender_email}>"
            msg["To"] = sender_email
            
            server.send_message(msg)
            print("✅ Test email sent successfully!")
            return True
            
    except Exception as e:
        print(f"❌ SMTP connection failed: {str(e)}")
        return False

if __name__ == "__main__":
    test_smtp_connection()
