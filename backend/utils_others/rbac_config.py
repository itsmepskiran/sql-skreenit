# Role-Based Access Control Configuration

# The system expects a simple dictionary: "role": ["list", "of", "permissions"]
ROLES_PERMISSIONS = {
    "recruiter": [
        "jobs:view",
        "jobs:create",
        "jobs:edit",
        "jobs:delete",
        "profile:view",
        "profile:edit",
        "applications:view",
        "dashboard:view",
        "notifications:create",
        "analytics:view"
    ],
    "candidate": [
        "jobs:view",
        "profile:view",
        "profile:edit",
        "applications:create",
        "applications:view",
        "dashboard:view",
        "video:upload"
    ],
    "admin": ["*"]
}