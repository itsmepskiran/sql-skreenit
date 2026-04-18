/**
 * Demo Mock Data for Skreenit
 * This file contains all mock data for the demo experience
 */

// Demo User Profiles
export const DEMO_USERS = {
    candidate: {
        id: 'demo-candidate-001',
        name: 'Rahul Sharma',
        email: 'rahul.sharma@demo.com',
        role: 'candidate',
        avatar: null,
        onboarded: true,
        profile_completion: 85,
        created_at: '2025-01-15'
    },
    recruiter: {
        id: 'demo-recruiter-001',
        name: 'Priya Patel',
        email: 'priya.patel@techcorp.com',
        role: 'recruiter',
        avatar: null,
        onboarded: true,
        company_name: 'TechCorp Solutions',
        company_id: 'company-001',
        created_at: '2024-12-01'
    }
};

// Demo Recruiter Profile with full details
export const DEMO_RECRUITER_PROFILE = {
    id: 'demo-recruiter-001',
    name: 'Priya Patel',
    email: 'priya.patel@techcorp.com',
    phone: '+91 9876543220',
    role: 'Senior HR Manager',
    department: 'Human Resources',
    company_name: 'TechCorp Solutions',
    company_id: 'company-001',
    company_logo: 'https://via.placeholder.com/120x120/667eea/ffffff?text=TC',
    company_website: 'https://techcorp.com',
    company_size: '500-1000 employees',
    company_founded: '2015',
    company_location: 'Hyderabad, India',
    company_industry: 'Information Technology',
    company_description: 'TechCorp Solutions is a leading IT services company specializing in digital transformation, cloud solutions, and enterprise software development. We serve clients across 20+ countries.',
    linkedin: 'https://linkedin.com/in/priya-patel-hr',
    location: 'Hyderabad, India',
    experience_years: 8,
    profile_completion: 92,
    jobs_posted: 5,
    total_hires: 23,
    avg_time_to_hire: '14 days',
    specializations: ['Technology Hiring', 'Product Management', 'Leadership Roles', 'Campus Recruitment'],
    certifications: [
        { name: 'LinkedIn Recruiter Certified', issuer: 'LinkedIn', year: '2024' },
        { name: 'SHRM-CP', issuer: 'SHRM', year: '2023' }
    ],
    achievements: [
        'Hired 50+ engineers in 2024',
        'Reduced time-to-hire by 30%',
        'Built campus recruitment program from scratch'
    ],
    recent_activity: [
        { type: 'job_posted', title: 'Senior Frontend Developer', date: '2025-03-01' },
        { type: 'candidate_hired', title: 'Backend Engineer - Vikram Singh', date: '2025-02-28' },
        { type: 'interview_completed', title: 'Product Manager - Arjun Nair', date: '2025-03-13' }
    ]
};

// Mock Jobs
export const DEMO_JOBS = [
    {
        id: 'job-001',
        title: 'Senior Frontend Developer',
        company_name: 'TechCorp Solutions',
        location: 'Hyderabad, India',
        job_type: 'Full-time',
        work_mode: 'Hybrid',
        salary_min: 1500000,
        salary_max: 2500000,
        currency: 'INR',
        experience_min: 3,
        experience_max: 6,
        description: 'We are looking for a passionate Senior Frontend Developer to join our growing team. You will be responsible for building and maintaining high-quality web applications using modern technologies.',
        requirements: [
            '3+ years of experience in React.js or Vue.js',
            'Strong understanding of HTML5, CSS3, and JavaScript',
            'Experience with state management (Redux, Vuex)',
            'Familiarity with RESTful APIs and GraphQL',
            'Good understanding of responsive design principles'
        ],
        skills: ['React', 'TypeScript', 'CSS', 'JavaScript', 'Node.js'],
        status: 'active',
        created_at: '2025-03-01',
        applications_count: 24,
        created_by: 'demo-recruiter-001',
        qr_code: 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://skreenit.com/job/job-001',
        views: 342,
        shares: 28
    },
    {
        id: 'job-002',
        title: 'Backend Engineer',
        company_name: 'TechCorp Solutions',
        location: 'Bangalore, India',
        job_type: 'Full-time',
        work_mode: 'Remote',
        salary_min: 1800000,
        salary_max: 3000000,
        currency: 'INR',
        experience_min: 4,
        experience_max: 8,
        description: 'Join our backend team to design and develop scalable microservices architecture. You will work on high-traffic systems serving millions of users.',
        requirements: [
            '4+ years of backend development experience',
            'Proficiency in Python or Node.js',
            'Experience with PostgreSQL, MongoDB',
            'Knowledge of Docker and Kubernetes',
            'Understanding of microservices architecture'
        ],
        skills: ['Python', 'Django', 'PostgreSQL', 'Docker', 'AWS'],
        status: 'active',
        created_at: '2025-03-05',
        applications_count: 18,
        created_by: 'demo-recruiter-001',
        qr_code: 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://skreenit.com/job/job-002',
        views: 256,
        shares: 15
    },
    {
        id: 'job-003',
        title: 'Product Manager',
        company_name: 'TechCorp Solutions',
        location: 'Hyderabad, India',
        job_type: 'Full-time',
        work_mode: 'On-site',
        salary_min: 2000000,
        salary_max: 3500000,
        currency: 'INR',
        experience_min: 5,
        experience_max: 10,
        description: 'Lead product strategy and roadmap for our B2B SaaS platform. Work closely with engineering, design, and business teams to deliver exceptional products.',
        requirements: [
            '5+ years of product management experience',
            'Experience with B2B SaaS products',
            'Strong analytical and data-driven mindset',
            'Excellent communication and leadership skills',
            'MBA preferred'
        ],
        skills: ['Product Strategy', 'Agile', 'Data Analysis', 'User Research', 'Roadmapping'],
        status: 'active',
        created_at: '2025-03-10',
        applications_count: 12,
        created_by: 'demo-recruiter-001',
        qr_code: 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://skreenit.com/job/job-003',
        views: 189,
        shares: 22
    },
    {
        id: 'job-004',
        title: 'UI/UX Designer',
        company_name: 'TechCorp Solutions',
        location: 'Remote',
        job_type: 'Full-time',
        work_mode: 'Remote',
        salary_min: 1200000,
        salary_max: 2000000,
        currency: 'INR',
        experience_min: 2,
        experience_max: 5,
        description: 'Create beautiful and intuitive user interfaces for our products. Collaborate with product and engineering teams to deliver exceptional user experiences.',
        requirements: [
            '2+ years of UI/UX design experience',
            'Proficiency in Figma and Adobe Creative Suite',
            'Strong portfolio showcasing web and mobile designs',
            'Understanding of design systems and component libraries',
            'Experience with user testing and research'
        ],
        skills: ['Figma', 'UI Design', 'UX Research', 'Prototyping', 'Design Systems'],
        status: 'active',
        created_at: '2025-03-12',
        applications_count: 31,
        created_by: 'demo-recruiter-001',
        qr_code: 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://skreenit.com/job/job-004',
        views: 412,
        shares: 35
    },
    {
        id: 'job-005',
        title: 'DevOps Engineer',
        company_name: 'TechCorp Solutions',
        location: 'Hyderabad, India',
        job_type: 'Full-time',
        work_mode: 'Hybrid',
        salary_min: 1600000,
        salary_max: 2800000,
        currency: 'INR',
        experience_min: 3,
        experience_max: 6,
        description: 'Build and maintain our cloud infrastructure. Implement CI/CD pipelines and ensure high availability of our services.',
        requirements: [
            '3+ years of DevOps experience',
            'Strong experience with AWS or Azure',
            'Proficiency in Terraform and Ansible',
            'Experience with Docker and Kubernetes',
            'Knowledge of monitoring tools (Prometheus, Grafana)'
        ],
        skills: ['AWS', 'Kubernetes', 'Terraform', 'CI/CD', 'Linux'],
        status: 'active',
        created_at: '2025-03-15',
        applications_count: 15,
        created_by: 'demo-recruiter-001',
        qr_code: 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://skreenit.com/job/job-005',
        views: 178,
        shares: 12
    }
];

// Mock Candidates (for recruiter view)
export const DEMO_CANDIDATES = [
    {
        id: 'candidate-001',
        name: 'Ananya Reddy',
        email: 'ananya.reddy@email.com',
        phone: '+91 9876543210',
        location: 'Hyderabad, India',
        experience_years: 4,
        current_company: 'Infosys',
        current_role: 'Software Engineer',
        skills: ['React', 'JavaScript', 'TypeScript', 'Node.js', 'Python'],
        education: 'B.Tech Computer Science, IIT Hyderabad',
        linkedin_url: 'https://linkedin.com/in/ananya-reddy',
        resume_url: '#demo-resume',
        profile_summary: 'Experienced frontend developer with 4 years of expertise in React and modern JavaScript frameworks. Passionate about building scalable web applications.',
        expected_salary: 2000000,
        notice_period: '30 days',
        profile_completion: 95
    },
    {
        id: 'candidate-002',
        name: 'Vikram Singh',
        email: 'vikram.singh@email.com',
        phone: '+91 9876543211',
        location: 'Bangalore, India',
        experience_years: 6,
        current_company: 'Wipro',
        current_role: 'Senior Backend Developer',
        skills: ['Python', 'Django', 'PostgreSQL', 'AWS', 'Docker'],
        education: 'M.Tech Computer Science, IISc Bangalore',
        linkedin_url: 'https://linkedin.com/in/vikram-singh',
        resume_url: '#demo-resume',
        profile_summary: 'Backend specialist with strong experience in Python and cloud technologies. Led multiple projects involving microservices architecture.',
        expected_salary: 2800000,
        notice_period: '60 days',
        profile_completion: 88
    },
    {
        id: 'candidate-003',
        name: 'Meera Krishnan',
        email: 'meera.k@email.com',
        phone: '+91 9876543212',
        location: 'Chennai, India',
        experience_years: 3,
        current_company: 'TCS',
        current_role: 'UI Designer',
        skills: ['Figma', 'Adobe XD', 'UI Design', 'Prototyping', 'CSS'],
        education: 'B.Des, NID Ahmedabad',
        linkedin_url: 'https://linkedin.com/in/meera-krishnan',
        resume_url: '#demo-resume',
        profile_summary: 'Creative UI designer with a keen eye for detail. Specialized in creating user-centric designs for web and mobile applications.',
        expected_salary: 1500000,
        notice_period: '15 days',
        profile_completion: 92
    },
    {
        id: 'candidate-004',
        name: 'Arjun Nair',
        email: 'arjun.nair@email.com',
        phone: '+91 9876543213',
        location: 'Kochi, India',
        experience_years: 7,
        current_company: 'Accenture',
        current_role: 'Product Manager',
        skills: ['Product Strategy', 'Agile', 'Data Analysis', 'User Research', 'Roadmapping'],
        education: 'MBA, IIM Calcutta',
        linkedin_url: 'https://linkedin.com/in/arjun-nair',
        resume_url: '#demo-resume',
        profile_summary: 'Strategic product manager with experience in B2B SaaS products. Successfully launched 5 products with significant market impact.',
        expected_salary: 3200000,
        notice_period: '45 days',
        profile_completion: 90
    },
    {
        id: 'candidate-005',
        name: 'Sneha Gupta',
        email: 'sneha.gupta@email.com',
        phone: '+91 9876543214',
        location: 'Pune, India',
        experience_years: 5,
        current_company: 'Capgemini',
        current_role: 'DevOps Engineer',
        skills: ['AWS', 'Kubernetes', 'Terraform', 'CI/CD', 'Linux', 'Python'],
        education: 'B.Tech Computer Science, VIT Vellore',
        linkedin_url: 'https://linkedin.com/in/sneha-gupta',
        resume_url: '#demo-resume',
        profile_summary: 'DevOps enthusiast with expertise in cloud infrastructure and automation. Certified AWS Solutions Architect.',
        expected_salary: 2400000,
        notice_period: '30 days',
        profile_completion: 85
    }
];

// Mock Applications
export const DEMO_APPLICATIONS = [
    {
        id: 'app-001',
        job_id: 'job-001',
        job_title: 'Senior Frontend Developer',
        company_name: 'TechCorp Solutions',
        candidate_id: 'candidate-001',
        candidate_name: 'Ananya Reddy',
        status: 'interviewing',
        applied_at: '2025-03-10T10:30:00Z',
        match_score: 92,
        interview_questions: [
            {
                id: 'q1',
                question: 'Tell us about your experience with React and how you handle state management in large applications.',
                video_url: 'https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4',
                recorded_at: '2025-03-12T14:30:00Z'
            },
            {
                id: 'q2',
                question: 'Describe a challenging bug you encountered and how you solved it.',
                video_url: 'https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4',
                recorded_at: '2022025-03-12T14:35:00Z'
            },
            {
                id: 'q3',
                question: 'How do you ensure your code is maintainable and scalable?',
                video_url: 'https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4',
                recorded_at: '2025-03-12T14:40:00Z'
            }
        ],
        analysis: {
            overall_score: 88,
            communication: 90,
            technical_knowledge: 85,
            confidence: 92,
            sentiment: 'positive'
        }
    },
    {
        id: 'app-002',
        job_id: 'job-002',
        job_title: 'Backend Engineer',
        company_name: 'TechCorp Solutions',
        candidate_id: 'candidate-002',
        candidate_name: 'Vikram Singh',
        status: 'shortlisted',
        applied_at: '2025-03-08T09:15:00Z',
        match_score: 95
    },
    {
        id: 'app-003',
        job_id: 'job-004',
        job_title: 'UI/UX Designer',
        company_name: 'TechCorp Solutions',
        candidate_id: 'candidate-003',
        candidate_name: 'Meera Krishnan',
        status: 'submitted',
        applied_at: '2025-03-14T16:45:00Z',
        match_score: 89
    },
    {
        id: 'app-004',
        job_id: 'job-003',
        job_title: 'Product Manager',
        company_name: 'TechCorp Solutions',
        candidate_id: 'candidate-004',
        candidate_name: 'Arjun Nair',
        status: 'interviewing',
        applied_at: '2025-03-11T11:20:00Z',
        match_score: 97,
        interview_questions: [
            {
                id: 'q1',
                question: 'Walk us through your process for defining a product roadmap.',
                video_url: 'https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4',
                recorded_at: '2025-03-13T10:00:00Z'
            },
            {
                id: 'q2',
                question: 'How do you prioritize features when you have limited resources?',
                video_url: 'https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4',
                recorded_at: '2025-03-13T10:05:00Z'
            }
        ],
        analysis: {
            overall_score: 91,
            communication: 95,
            technical_knowledge: 88,
            confidence: 90,
            sentiment: 'positive'
        }
    },
    {
        id: 'app-005',
        job_id: 'job-005',
        job_title: 'DevOps Engineer',
        company_name: 'TechCorp Solutions',
        candidate_id: 'candidate-005',
        candidate_name: 'Sneha Gupta',
        status: 'rejected',
        applied_at: '2025-03-09T13:30:00Z',
        match_score: 78,
        rejection_reason: 'Position filled with internal candidate'
    },
    {
        id: 'app-006',
        job_id: 'job-001',
        job_title: 'Senior Frontend Developer',
        company_name: 'TechCorp Solutions',
        candidate_id: 'candidate-003',
        candidate_name: 'Meera Krishnan',
        status: 'submitted',
        applied_at: '2025-03-15T09:00:00Z',
        match_score: 72
    },
    {
        id: 'app-007',
        job_id: 'job-002',
        job_title: 'Backend Engineer',
        company_name: 'TechCorp Solutions',
        candidate_id: 'candidate-005',
        candidate_name: 'Sneha Gupta',
        status: 'reviewing',
        applied_at: '2025-03-13T14:20:00Z',
        match_score: 81
    },
    {
        id: 'app-008',
        job_id: 'job-003',
        job_title: 'Product Manager',
        company_name: 'TechCorp Solutions',
        candidate_id: 'candidate-001',
        candidate_name: 'Ananya Reddy',
        status: 'submitted',
        applied_at: '2025-03-16T10:00:00Z',
        match_score: 65
    }
];

// Demo Candidate's Applications (for candidate view)
export const DEMO_CANDIDATE_APPLICATIONS = [
    {
        id: 'app-demo-001',
        job_id: 'job-001',
        job_title: 'Senior Frontend Developer',
        company_name: 'TechCorp Solutions',
        location: 'Hyderabad, India',
        status: 'interviewing',
        applied_at: '2025-03-10T10:30:00Z',
        match_score: 92,
        interview_questions: [
            {
                id: 'q1',
                question: 'Tell us about your experience with React and how you handle state management in large applications.',
                video_url: 'https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4',
                recorded_at: '2025-03-12T14:30:00Z'
            },
            {
                id: 'q2',
                question: 'Describe a challenging bug you encountered and how you solved it.',
                video_url: 'https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4',
                recorded_at: '2025-03-12T14:35:00Z'
            }
        ]
    },
    {
        id: 'app-demo-002',
        job_id: 'job-002',
        job_title: 'Backend Engineer',
        company_name: 'TechCorp Solutions',
        location: 'Bangalore, India',
        status: 'submitted',
        applied_at: '2025-03-15T09:00:00Z',
        match_score: 85
    },
    {
        id: 'app-demo-003',
        job_id: 'job-003',
        job_title: 'Product Manager',
        company_name: 'TechCorp Solutions',
        location: 'Hyderabad, India',
        status: 'rejected',
        applied_at: '2025-02-20T11:00:00Z',
        match_score: 68,
        rejection_reason: 'Looking for more experienced candidates'
    }
];

// Demo Interview Questions (for interview room)
export const DEMO_INTERVIEW_QUESTIONS = [
    {
        id: 'iq-001',
        question: 'Tell us about yourself and your professional background.',
        preparation_time: 30,
        recording_time: 120
    },
    {
        id: 'iq-002',
        question: 'What interests you about this role and our company?',
        preparation_time: 30,
        recording_time: 90
    },
    {
        id: 'iq-003',
        question: 'Describe a challenging project you worked on and how you overcame the challenges.',
        preparation_time: 45,
        recording_time: 150
    },
    {
        id: 'iq-004',
        question: 'How do you stay updated with the latest technologies and industry trends?',
        preparation_time: 30,
        recording_time: 90
    },
    {
        id: 'iq-005',
        question: 'Where do you see yourself in 5 years?',
        preparation_time: 30,
        recording_time: 90
    }
];

// Demo Notifications
export const DEMO_NOTIFICATIONS = [
    {
        id: 'notif-001',
        type: 'application_update',
        title: 'Application Status Updated',
        message: 'Your application for Senior Frontend Developer has been shortlisted for interview.',
        read: false,
        created_at: '2025-03-12T10:00:00Z'
    },
    {
        id: 'notif-002',
        type: 'new_job',
        title: 'New Job Matching Your Profile',
        message: 'A new job "Backend Engineer" at TechCorp Solutions matches your skills.',
        read: false,
        created_at: '2025-03-14T09:00:00Z'
    },
    {
        id: 'notif-003',
        type: 'reminder',
        title: 'Complete Your Profile',
        message: 'Complete your profile to increase your chances of getting noticed by recruiters.',
        read: true,
        created_at: '2025-03-10T08:00:00Z'
    }
];

// Demo Stats
export const DEMO_STATS = {
    candidate: {
        total_applications: 3,
        pending_applications: 1,
        reviewing_applications: 0,
        shortlisted_applications: 1,
        interview_scheduled: 1,
        rejected_applications: 1,
        profile_completion: 85
    },
    recruiter: {
        total_jobs: 5,
        active_jobs: 5,
        total_applications: 8,
        new_applications: 3,
        interviewing: 2,
        shortlisted: 1,
        rejected: 1
    }
};

// Demo Candidate Profile with full details
export const DEMO_CANDIDATE_PROFILE = {
    id: 'demo-candidate-001',
    name: 'Rahul Sharma',
    email: 'rahul.sharma@demo.com',
    phone: '+91 9876543210',
    location: 'Hyderabad, India',
    current_role: 'Senior Software Engineer',
    current_company: 'TechStart Solutions',
    experience_years: 4,
    education: 'B.Tech Computer Science, IIT Hyderabad',
    linkedin: 'https://linkedin.com/in/rahul-sharma',
    github: 'https://github.com/rahul-sharma',
    portfolio: 'https://rahulsharma.dev',
    skills: ['React', 'TypeScript', 'Node.js', 'Python', 'AWS', 'Docker', 'PostgreSQL', 'GraphQL', 'Next.js', 'TailwindCSS'],
    summary: 'Experienced full-stack developer with 4 years of expertise in React, Node.js, and cloud technologies. Passionate about building scalable web applications and mentoring junior developers. Strong problem-solving skills and experience in agile methodologies.',
    expected_salary: '20-25 LPA',
    notice_period: '30 days',
    profile_completion: 85,
    resume_url: '#demo-resume',
    video_intro_url: '#demo-video',
    // AI Analysis Report
    ai_analysis: {
        overall_score: 87,
        communication_score: 92,
        technical_score: 88,
        confidence_score: 85,
        sentiment: 'positive',
        strengths: [
            'Excellent communication skills',
            'Strong technical knowledge in React and Node.js',
            'Good problem-solving approach',
            'Clear and concise responses'
        ],
        areas_for_improvement: [
            'Could elaborate more on system design concepts',
            'More examples of leadership experience would be beneficial'
        ],
        skills_assessment: {
            'React': 95,
            'Node.js': 90,
            'TypeScript': 88,
            'AWS': 82,
            'Docker': 85,
            'Communication': 92,
            'Problem Solving': 88
        },
        interview_readiness: 'High',
        recommended_roles: ['Senior Frontend Developer', 'Full Stack Developer', 'Technical Lead'],
        generated_at: '2025-03-15T10:30:00Z'
    },
    // Video Interview Samples
    video_interviews: [
        {
            id: 'vi-001',
            question: 'Tell us about yourself and your professional background.',
            duration: '2:30',
            recorded_at: '2025-03-12T14:30:00Z',
            thumbnail: 'https://via.placeholder.com/320x180/667eea/ffffff?text=Video+1'
        },
        {
            id: 'vi-002',
            question: 'Describe a challenging project you worked on and how you overcame obstacles.',
            duration: '3:15',
            recorded_at: '2025-03-12T14:35:00Z',
            thumbnail: 'https://via.placeholder.com/320x180/764ba2/ffffff?text=Video+2'
        },
        {
            id: 'vi-003',
            question: 'How do you stay updated with the latest technologies?',
            duration: '1:45',
            recorded_at: '2025-03-12T14:40:00Z',
            thumbnail: 'https://via.placeholder.com/320x180/22c55e/ffffff?text=Video+3'
        }
    ],
    // Work Experience
    work_experience: [
        {
            company: 'TechStart Solutions',
            role: 'Senior Software Engineer',
            duration: 'Jan 2023 - Present',
            location: 'Hyderabad',
            description: 'Leading frontend development for a SaaS platform. Managing a team of 5 developers.'
        },
        {
            company: 'InnovateTech',
            role: 'Software Engineer',
            duration: 'Jun 2021 - Dec 2022',
            location: 'Bangalore',
            description: 'Built and maintained React applications. Implemented CI/CD pipelines.'
        },
        {
            company: 'StartupXYZ',
            role: 'Junior Developer',
            duration: 'Jul 2020 - May 2021',
            location: 'Hyderabad',
            description: 'Developed features for mobile and web applications using React Native.'
        }
    ],
    // Education Details
    education_details: [
        {
            degree: 'B.Tech Computer Science',
            institution: 'IIT Hyderabad',
            year: '2020',
            grade: '8.5 CGPA'
        }
    ],
    // Certifications
    certifications: [
        { name: 'AWS Solutions Architect Associate', issuer: 'Amazon Web Services', year: '2024' },
        { name: 'Meta Frontend Developer Certificate', issuer: 'Meta', year: '2023' },
        { name: 'Docker Certified Associate', issuer: 'Docker', year: '2022' }
    ],
    // Languages
    languages: ['English (Fluent)', 'Hindi (Native)', 'Telugu (Conversational)']
};

// Demo Application Manager - tracks new applications made during demo
export const DemoApplicationManager = {
    STORAGE_KEY: 'demo_new_applications',
    
    getApplications() {
        const stored = sessionStorage.getItem(this.STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    },
    
    addApplication(jobId, jobTitle, companyName, location) {
        const applications = this.getApplications();
        const newApp = {
            id: `new-app-${Date.now()}`,
            job_id: jobId,
            job_title: jobTitle,
            company_name: companyName,
            location: location,
            status: 'submitted',
            applied_at: new Date().toISOString(),
            match_score: Math.floor(Math.random() * 20) + 75, // Random 75-95
            is_new: true
        };
        applications.push(newApp);
        sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(applications));
        return newApp;
    },
    
    hasApplied(jobId) {
        const applications = this.getApplications();
        const existingApps = DEMO_CANDIDATE_APPLICATIONS.filter(a => a.job_id === jobId);
        return applications.some(a => a.job_id === jobId) || existingApps.length > 0;
    },
    
    getAllApplications() {
        const newApps = this.getApplications();
        return [...DEMO_CANDIDATE_APPLICATIONS, ...newApps];
    },
    
    clear() {
        sessionStorage.removeItem(this.STORAGE_KEY);
    }
};

// Helper to simulate API delay
export const mockDelay = (ms = 500) => new Promise(resolve => setTimeout(resolve, ms));

// Demo Session Manager
export const DemoSession = {
    getRole() {
        return sessionStorage.getItem('demo_role') || null;
    },
    
    setRole(role) {
        sessionStorage.setItem('demo_role', role);
    },
    
    clear() {
        sessionStorage.removeItem('demo_role');
    },
    
    isActive() {
        return !!sessionStorage.getItem('demo_role');
    }
};

console.log('[Demo] Demo data loaded successfully');
