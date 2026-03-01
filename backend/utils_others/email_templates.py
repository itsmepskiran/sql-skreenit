from typing import Dict, Any
from pathlib import Path
import os
from jinja2 import Environment, FileSystemLoader, TemplateNotFound, select_autoescape
from utils_others.logger import logger


class EmailTemplates:
    """
    Loads and renders HTML email templates using Jinja2.
    Templates live in backend/utils_others/templates/.
    """

    def __init__(self):
        self.template_dir = Path(__file__).parent / "templates"
        self.template_dir.mkdir(exist_ok=True)

        self.env = Environment(
            loader=FileSystemLoader(str(self.template_dir)),
            autoescape=select_autoescape(["html", "xml"]),
            cache_size=50,  # enable caching
        )

        self.frontend_url = os.getenv("FRONTEND_BASE_URL", "https://login.skreenit.com")

    # ---------------------------------------------------------
    # INTERNAL HELPER
    # ---------------------------------------------------------
    def _render(self, template_name: str, context: Dict[str, Any]) -> str:
        """
        Safely render a template with context.
        """
        try:
            template = self.env.get_template(template_name)
            return template.render(**context)

        except TemplateNotFound:
            logger.error(f"Email template not found: {template_name}")
            raise RuntimeError(f"Email template missing: {template_name}")

        except Exception as e:
            logger.error(
                f"Email template render failed: {str(e)}",
                extra={"template": template_name},
            )
            raise RuntimeError("Failed to render email template")

    # ---------------------------------------------------------
    # PUBLIC TEMPLATES
    # ---------------------------------------------------------
    def registration_confirmation(self, user_data: Dict[str, Any]) -> Dict[str, str]:
        return {
            "subject": "Welcome to Skreenit!",
            "html": self._render(
                "registration_confirmation.html",
                {
                    "name": user_data.get("full_name"),
                    "role": user_data.get("role"),
                    "login_url": self.frontend_url,
                },
            ),
            "text": f"Welcome to Skreenit, {user_data.get('full_name')}! Login at {self.frontend_url}",
        }

    def recruiter_welcome(self, user_data: Dict[str, Any]) -> Dict[str, str]:
        return {
            "subject": "Your Recruiter Account is Ready",
            "html": self._render(
                "recruiter_welcome.html",
                {
                    "name": user_data.get("full_name"),
                    "email": user_data.get("email"),
                    "company_id": user_data.get("company_id"),
                    "login_url": self.frontend_url,
                },
            ),
            "text": f"Welcome {user_data.get('full_name')}! Login at {self.frontend_url}",
        }

    def password_reset(self, user_data: Dict[str, Any]) -> Dict[str, str]:
        return {
            "subject": "Reset Your Password",
            "html": self._render(
                "password_reset.html",
                {
                    "name": user_data.get("full_name"),
                    "reset_url": user_data.get("reset_url"),
                },
            ),
            "text": f"Reset your password: {user_data.get('reset_url')}",
        }

    def password_updated(self, user_data: Dict[str, Any]) -> Dict[str, str]:
        return {
            "subject": "Your Password Has Been Updated",
            "html": self._render(
                "password_updated.html",
                {
                    "name": user_data.get("full_name"),
                    "login_url": self.frontend_url,
                },
            ),
            "text": f"Your password was updated. Login at {self.frontend_url}",
        }


# ---------------------------------------------------------
# DEFAULT TEMPLATE GENERATOR (RUNS ONLY IF FILES MISSING)
# ---------------------------------------------------------
def write_default_templates() -> None:
    """
    Creates default HTML templates only if they do not exist.
    Safe to run multiple times.
    """
    template_dir = Path(__file__).parent / "templates"
    template_dir.mkdir(exist_ok=True)

    templates = {
        "registration_confirmation.html": """<!DOCTYPE html>
<html>
<body>
    <h2>Welcome to Skreenit!</h2>
    <p>Dear {{ name }},</p>
    <p>Thank you for registering with Skreenit as a {{ role }}.</p>
    <p>Please click the verification link in your email to confirm your address and set up your password.</p>
    <p><a href="{{ login_url }}">{{ login_url }}</a></p>
</body>
</html>""",

        "recruiter_welcome.html": """<!DOCTYPE html>
<html>
<body>
    <h2>Welcome to Skreenit!</h2>
    <p>Dear {{ name }},</p>
    <p>Your recruiter account has been created successfully.</p>
    <ul>
        <li><strong>Login Email:</strong> {{ email }}</li>
        <li><strong>Company ID:</strong> {{ company_id }}</li>
    </ul>
    <p><a href="{{ login_url }}">{{ login_url }}</a></p>
</body>
</html>""",

        "password_reset.html": """<!DOCTYPE html>
<html>
<body>
    <h2>Reset Your Password</h2>
    <p>Dear {{ name }},</p>
    <p><a href="{{ reset_url }}">Reset Password</a></p>
</body>
</html>""",

        "password_updated.html": """<!DOCTYPE html>
<html>
<body>
    <h2>Password Updated Successfully</h2>
    <p>Dear {{ name }},</p>
    <p><a href="{{ login_url }}">{{ login_url }}</a></p>
</body>
</html>""",
    }

    for filename, content in templates.items():
        file_path = template_dir / filename
        if not file_path.exists():
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(content)
            logger.info(f"Created default email template: {filename}")


write_default_templates()
# backend/utils_others/email_templates.py
def get_verification_template(full_name, confirmation_url):
    return f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Confirm Your Skreenit Account</title>
    <style>
        body {{
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 20px;
            background-color: #f8f9fa;
        }}
        .container {{
            max-width: 600px;
            margin: 0 auto;
            background-color: white;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            overflow: hidden;
        }}
        .header {{
            text-align: center;
            margin-bottom: 30px;
        }}
        .logo {{
            max-width: 250px;
            height: 85px;
            border-radius: 8px;
        }}
        .brand-text {{
            color: #666;
            font-size: 14px;
            font-style: italic;
            margin-top: 10px;
        }}
        h1 {{
            color: #272e35;
            font-size: 33px;
            margin: 20px 0 0 0;
        }}
        .confirmation-card {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 30px;
            border-radius: 10px;
            text-align: center;
            color: white;
        }}
        .confirmation-card h2 {{
            font-size: 24px;
            margin: 0 0 20px 0;
        }}
        .confirmation-card p {{
            font-size: 16px;
            text-align: left;
            margin: 0 0 20px 0;
        }}
        .btn {{
            display: inline-block;
            background: white;
            color: #667eea;
            padding: 15px 30px;
            text-decoration: none;
            border-radius: 5px;
            font-weight: bold;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            margin: 30px 0;
        }}
        .footer {{
            text-align: center;
            color: #666;
            font-size: 12px;
            margin-top: 20px;
        }}
        .footer p {{
            margin: 10px 0;
        }}
        .footer-text {{
            text-align: left;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <a href="https://login.skreenit.com" target="_blank">
                <img src="https://assets.skreenit.com/assets/images/logobrand.png" alt="Skreenit Logo" class="logo">
            </a>
            <p class="brand-text">Skreenit Platform</p>
            <h1>Welcome to Skreenit!</h1>
        </div>
        
        <div class="confirmation-card">
            <h2>Confirm Your Email Address</h2>
            <p>Hi {full_name},</p>
            <p>Thank you for registering! Please click the button below to confirm your email address and activate your account.</p>
            <a href="{confirmation_url}" class="btn" target="_blank">Confirm Your Email Address</a>
            <p style="font-size: 14px; opacity: 0.8; text-align: left; margin: 20px 0 0 0;">
                This link will expire in 24 hours. If you didn't create this account, you can safely ignore this email.
            </p>
        </div>
        
        <div class="footer">
            <div class="footer-text">
                <p><strong>Important:</strong> Please check your spam/junk folder if you don't see this email in your inbox.</p>
                <p>Add noreply@skreenit.com to your contacts to ensure future emails reach your inbox.</p>
            </div>
            <p>&copy; 2026 Skreenit. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
    """