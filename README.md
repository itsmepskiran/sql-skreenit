# Skreenit - AI-Powered Recruitment Platform

Skreenit is a modern recruitment platform that leverages AI to streamline the hiring process, making it faster and more efficient for both recruiters and candidates.

## Features

- **For Candidates**
  - Easy profile creation
  - AI-powered job matching
  - Video interview capabilities
  - Application tracking

- **For Recruiters**
  - AI-driven candidate screening
  - Video interview platform
  - Advanced analytics
  - Team collaboration tools

## Tech Stack

- **Frontend**: HTML5, CSS3, JavaScript, React
- **Backend**: Python, FastAPI
- **Database**: MySQL (phpMyAdmin)
- **Authentication**: Custom Auth
- **Deployment**: Render (Backend)
- **Email Flow**: SMTP (Hostinger)

## Getting Started

### Prerequisites

- Python 3.11 or higher
- npm 9.x or higher
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/itsmepskiran/sql-skreenit.git
   cd skreenit
   ```

2. **Set up the backend**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: .\venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. **Set up the frontend**
   ```bash
   cd ../
   ```

### Configuration

1. Create a `.env` file in the `backend` directory with the following variables:
   ```
CLOUDFLARE_ACCOUNT_ID
CLOUDFLARE_R2_ACCESS_KEY
CLOUDFLARE_R2_SECRET_KEY
DEBUG
FROM_EMAIL
FROM_NAME
EMAIL_FROM
FRONTEND_BASE_URL
MYSQL_DATABASE
MYSQL_HOST
MYSQL_PASSWORD=
MYSQL_PORT
MYSQL_USER=
PORT=
PROFILE_IMAGE_PUBLIC_URL
PROFILE_IMAGE_UPLOAD_PATH
PUBLIC_BASE_URL
R2_BUCKET_NAME
R2_ENDPOINT
RESUME_PUBLIC_URL
RESUME_UPLOAD_PATH
VIDEO_PUBLIC_URL
VIDEO_UPLOAD_PATH
JWT_SECRET_KEY=
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30
JWT_REFRESH_TOKEN_EXPIRE_DAYS=7
HOSTINGER_EMAIL_PASSWORD
   ```

2. Create a `.env` file in the `frontend` directory with your frontend environment variables.

### Running Locally

1. **Start the backend**
   ```bash
   cd backend
   uvicorn main:app --reload
   ```

2. **Start the frontend**
   ```bash
   cd frontend
   npm start
   ```

## Deployment

### Backend (Render)
1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Set the build command: `pip install -r backend/requirements.txt`
4. Set the start command: `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
5. Add environment variables in the Render dashboard

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contact

For any questions or feedback, please contact us at support@skreenit.com
