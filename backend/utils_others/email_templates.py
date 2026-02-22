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
