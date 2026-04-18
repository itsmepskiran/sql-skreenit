# Resend Email Templates Setup Guide

## 📧 Template Files for Resend

This folder contains email templates formatted for **Resend API** with proper template variables.

### Available Templates:

1. **resend_welcome.html** - Account verification email
   - Variables: `{{full_name}}`, `{{confirmation_url}}`, `{{loginLink}}`

2. **resend_password_reset.html** - Password reset email
   - Variables: `{{full_name}}`, `{{reset_url}}`

---

## 🔧 How to Upload Templates to Resend

### Step 1: Go to Resend Dashboard
1. Login at https://resend.com
2. Click **"Templates"** in the left sidebar
3. Click **"Create Template"**

### Step 2: Create Welcome Template
1. **Template Name**: `Welcome - Account Verification`
2. **Template ID**: `welcome-template` (or custom ID)
3. **Subject**: `Verify Your Skreenit Account`
4. **From**: `Skreenit <support@skreenit.com>`
5. **Copy HTML**: Paste content from `resend_welcome.html`
6. Click **"Save"**

### Step 3: Create Password Reset Template
1. **Template Name**: `Password Reset`
2. **Template ID**: `reset-template` (or custom ID)
3. **Subject**: `Reset Your Skreenit Password`
4. **From**: `Skreenit <support@skreenit.com>`
5. **Copy HTML**: Paste content from `resend_password_reset.html`
6. Click **"Save"**

### Step 4: Create Support Template (Optional)
1. **Template Name**: `Support Request`
2. **Template ID**: `support-template`
3. **Variables**: `{{subject}}`, `{{content}}`, `{{support_email}}`

### Step 5: Create Notification Template (Optional)
1. **Template Name**: `General Notification`
2. **Template ID**: `notification-template`
3. **Variables**: `{{subject}}`, `{{content}}`

---

## 🔌 Update Code Template IDs (if using custom IDs)

If you use different template IDs than the defaults, update your `.env` file:

```bash
RESEND_TEMPLATE_VERIFICATION=your-custom-verification-id
RESEND_TEMPLATE_PASSWORD_RESET=your-custom-reset-id
RESEND_TEMPLATE_SUPPORT=your-custom-support-id
RESEND_TEMPLATE_NOTIFICATION=your-custom-notification-id
```

Or update directly in `email_service.py`:

```python
self.templates = {
    "verification": "your-custom-verification-id",
    "password_reset": "your-custom-reset-id",
    "support": "your-custom-support-id",
    "notification": "your-custom-notification-id"
}
```

---

## 📊 Variable Reference

| Template | Variables Available |
|----------|-------------------|
| Welcome | `{{full_name}}`, `{{confirmation_url}}`, `{{loginLink}}` |
| Password Reset | `{{full_name}}`, `{{reset_url}}` |
| Support | `{{subject}}`, `{{content}}`, `{{support_email}}` |
| Notification | `{{subject}}`, `{{content}}` |

---

## 🧪 Testing

After uploading templates to Resend:

```powershell
# Test welcome email
Invoke-WebRequest -Method POST -Uri "https://backend.skreenit.com/api/v1/debug-email"

# Or test user registration directly
```

---

## 💡 Template Features

✅ **Modern gradient design**
✅ **Mobile responsive**
✅ **Professional branding**
✅ **Call-to-action buttons**
✅ **Security notices**
✅ **Footer with contact info**

---

## 🎨 Design Notes

- Uses **Inter/System fonts** for cross-platform compatibility
- **Purple gradient** (#667eea to #764ba2) matching Skreenit branding
- **White buttons** with shadow for prominence
- **Responsive** container (max-width: 600px)
- **Clean footer** with copyright and support info

---

## 🚀 Next Steps

1. Upload templates to Resend dashboard
2. Copy template IDs
3. Update environment variables (if needed)
4. Deploy code
5. Test registration flow

**Questions?** Check Resend docs: https://resend.com/docs/knowledge-base/templates
