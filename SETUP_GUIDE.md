# 🚀 ColdMail SaaS - Complete Setup Guide

Welcome to the ColdMail SaaS platform! This guide will walk you through setting up everything you need to get the project running on your local machine.

## 📋 Prerequisites

Before you start, make sure you have the following installed:

- **Node.js** (version 18 or higher) - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js)
- **Docker Desktop** - [Download here](https://www.docker.com/products/docker-desktop/)
- **Git** - [Download here](https://git-scm.com/)

## 🗂️ Project Structure

```
ColdMail-SAAS/
├── apps/
│   ├── api/          # Backend API (NestJS)
│   └── web/          # Frontend (React)
├── docker/            # Database setup files
├── docker-compose.yml # Docker services configuration
└── env.example       # Environment variables template
```

## 🐳 Step 1: Database Setup with Docker

### 1.1 Start Docker Desktop
- Open Docker Desktop on your computer
- Wait for it to start (you'll see the Docker icon in your system tray)

### 1.2 Start the Database
Open your terminal/command prompt in the project folder and run:

```bash
docker-compose up -d
```

This command will:
- Start a PostgreSQL database
- Start a Redis server (for caching and job queues)
- Create the necessary database containers

### 1.3 Verify Database is Running
```bash
docker ps
```

You should see containers for PostgreSQL and Redis running.

## 🔑 Step 2: Environment Configuration

### 2.1 Copy Environment Template
```bash
cp env.example .env
```

### 2.2 Configure Environment Variables
Open the `.env` file in your code editor and fill in the following values:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=coldmail_saas

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT Secret (generate a random string)
JWT_SECRET=your-super-secret-jwt-key-here

# OpenAI API Key (for AI features)
OPENAI_API_KEY=your-openai-api-key-here

# Email Service Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# App Configuration
APP_PORT=3000
NODE_ENV=development
```

### 2.3 Generate JWT Secret
You can generate a random JWT secret using this command:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Copy the output and paste it as your `JWT_SECRET`.

## 🔑 Step 3: Getting API Keys

### 3.1 OpenAI API Key
1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in
3. Go to "API Keys" section
4. Click "Create new secret key"
5. Copy the key and paste it in your `.env` file

### 3.2 Gmail App Password (for sending emails)
1. Go to [Google Account Settings](https://myaccount.google.com/)
2. Navigate to "Security"
3. Enable "2-Step Verification" if not already enabled
4. Go to "App passwords"
5. Generate a new app password for "Mail"
6. Use this password as your `SMTP_PASS`

## 📦 Step 4: Install Dependencies

### 4.1 Install Root Dependencies
```bash
npm install
```

### 4.2 Install API Dependencies
```bash
cd apps/api
npm install
cd ../..
```

### 4.3 Install Web Dependencies
```bash
cd apps/web
npm install
cd ../..
```

## 🗄️ Step 5: Database Initialization

### 5.1 Create Database Tables
```bash
npm run db:migrate
```

### 5.2 (Optional) Add Sample Data
```bash
npm run db:seed
```

## 🚀 Step 6: Start the Application

### 6.1 Start the Backend API
```bash
npm run dev
```

This will start the NestJS API server on port 3000.

### 6.2 Start the Frontend (in a new terminal)
```bash
cd apps/web
npm start
```

This will start the React frontend on port 3001.

## 🌐 Step 7: Access Your Application

- **Backend API**: http://localhost:3000
- **Frontend**: http://localhost:3001
- **API Documentation**: http://localhost:3000/api (Swagger docs)

## 🔧 Troubleshooting Common Issues

### Issue: "Cannot connect to database"
**Solution**: Make sure Docker is running and containers are up:
```bash
docker-compose ps
docker-compose up -d
```

### Issue: "Port already in use"
**Solution**: Change the port in your `.env` file:
```env
APP_PORT=3001
```

### Issue: "JWT_SECRET is required"
**Solution**: Make sure you've set the JWT_SECRET in your `.env` file.

### Issue: "OpenAI API key invalid"
**Solution**: Verify your OpenAI API key is correct and has sufficient credits.

## 📚 Understanding the Components

### Backend (NestJS)
- **Authentication**: JWT-based user login/registration
- **Email Management**: Campaign creation, sending, and tracking
- **AI Integration**: OpenAI-powered email optimization
- **Database**: PostgreSQL for data storage
- **Caching**: Redis for performance optimization

### Frontend (React)
- **Dashboard**: Overview of campaigns and metrics
- **Campaign Management**: Create and manage email campaigns
- **Contact Management**: Manage your email lists
- **Analytics**: Track campaign performance

## 🛡️ Security Notes

- Never commit your `.env` file to version control
- Keep your API keys secure and don't share them
- Use strong passwords for your database
- Regularly update your dependencies

## 📞 Getting Help

If you encounter issues:

1. Check the error messages in your terminal
2. Verify all environment variables are set correctly
3. Ensure Docker containers are running
4. Check that all ports are available
5. Review the logs: `docker-compose logs`

## 🎉 You're All Set!

Once you've completed all these steps, you should have a fully functional ColdMail SaaS platform running locally. You can:

- Create user accounts
- Set up email campaigns
- Use AI-powered email optimization
- Track campaign performance
- Manage your contact lists

Happy emailing! 📧✨
