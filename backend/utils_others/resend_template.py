import resend
import os

resend.api_key = os.getenv("RESEND_API_KEY")

# Replace 'your-template-id' with the real ID from your URL
resend.Templates.update(
    template_id="b9af4576-f781-43f4-8ebb-82ff356e319a",
    name="Email Confirmation",
    html="""
    <div style="font-family: sans-serif; text-align: center;">
        <h1>Welcome to Skreenit!</h1>
        <p>Hi {{full_name}}, please confirm your email below:</p>
        <a href="{{confirmation_url}}" 
           style="background: #667eea; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; display: inline-block;">
           Confirm Email
        </a>
    </div>
    """
)
print("Template updated via API! Check the dashboard now.")