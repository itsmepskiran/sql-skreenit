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
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Deployment**: Render (Backend)
- **Email Flow**: Resend

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- Python 3.11 or higher
- npm 9.x or higher
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/itsmepskiran/UP-skreenit.git
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
   cd ../frontend
   npm install
   ```

### Configuration

1. Create a `.env` file in the `backend` directory with the following variables:
   ```
   SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   RESEND_API_KEY=your_resend_api_key
   EMAIL_FROM=your_email@example.com
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
