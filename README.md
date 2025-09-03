# Cold Email SaaS Platform

A multi-tenant cold email automation platform built with NestJS, TypeScript, and modern cloud infrastructure.

## 🚀 Features

- **Multi-tenant Architecture**: Support for agencies, clients, and enterprise organizations
- **User Management**: Role-based access control with hierarchical permissions
- **Email Campaigns**: Automated email sequences with personalization
- **Domain Verification**: SPF, DKIM, and DMARC setup automation
- **SMTP Management**: Secure mailbox configuration and rotation
- **Analytics**: Real-time campaign tracking and reporting
- **AI Integration**: GPT-powered subject lines and content suggestions
- **Compliance**: GDPR, CAN-SPAM, and CASL compliance built-in

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   API Gateway   │    │   Load Balancer │
│   (React)       │◄──►│   (NestJS)      │◄──►│   (AWS ALB)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   PostgreSQL    │    │     Redis       │    │   AWS SES       │
│   (RDS)         │    │  (ElastiCache)   │    │   (Fallback)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🛠️ Tech Stack

- **Backend**: NestJS + TypeScript
- **Database**: PostgreSQL with TypeORM
- **Cache/Queue**: Redis + BullMQ
- **Authentication**: JWT + Passport
- **Documentation**: Swagger/OpenAPI
- **Containerization**: Docker + Docker Compose
- **Monitoring**: Health checks + Prometheus
- **Testing**: Jest + Supertest
- **AI**: OpenAI GPT-4 integration

## 📋 Prerequisites

- Node.js 18+ 
- Docker & Docker Compose
- PostgreSQL 15+
- Redis 7+
- OpenAI API Key (for AI features)

## 🚀 Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/shreyescodes/ColdMailSaaS
cd coldmail-saas
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

```bash
cp env.example .env
# Edit .env with your configuration
# Add OpenAI API key for AI features:
# OPENAI_API_KEY=your_openai_api_key_here
```

### 4. Start the development environment

```bash
# Start all services
npm run docker:up

# Or start individual services
docker-compose up postgres redis
npm run dev
```

### 5. Access the application

- **API**: http://localhost:3000
- **API Docs**: http://localhost:3000/api/docs
- **Health Check**: http://localhost:3000/health
- **MailHog**: http://localhost:8025 (for email testing)

## 🔧 Development

### Project Structure

```
coldmail-saas/
├── apps/
│   └── api/                    # NestJS API application
│       ├── src/
│       │   ├── config/         # Configuration files
│       │   ├── modules/        # Feature modules
│       │   ├── health/         # Health checks
│       │   └── main.ts         # Application entry point
│       ├── Dockerfile          # Docker configuration
│       └── package.json        # API dependencies
├── docker/                     # Docker configuration
│   └── postgres/              # Database initialization
├── docker-compose.yml          # Development services
├── nx.json                     # Nx workspace configuration
└── package.json                # Root dependencies
```

### Available Scripts

```bash
# Development
npm run dev              # Start API in development mode
npm run build            # Build all applications
npm run test             # Run tests
npm run lint             # Lint code

# Database
npm run db:migrate       # Run database migrations
npm run db:seed          # Seed database with sample data

# Docker
npm run docker:build     # Build Docker images
npm run docker:up        # Start all services
npm run docker:down      # Stop all services
```

### API Endpoints

#### Authentication
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/register` - User registration
- `GET /api/v1/auth/verify-email/:token` - Verify email
- `POST /api/v1/auth/forgot-password` - Request password reset
- `POST /api/v1/auth/reset-password` - Reset password

#### Users
- `GET /api/v1/users` - Get users in organization
- `GET /api/v1/users/:id` - Get user by ID
- `PUT /api/v1/users/:id` - Update user
- `DELETE /api/v1/users/:id` - Delete user

#### Organizations
- `GET /api/v1/organizations` - Get organizations
- `GET /api/v1/organizations/:id` - Get organization by ID
- `POST /api/v1/organizations` - Create organization
- `PUT /api/v1/organizations/:id` - Update organization

#### AI & Personalization
- `POST /api/v1/ai/content-suggestions` - Generate AI-powered email content
- `POST /api/v1/ai/subject-lines` - Generate AI-powered subject lines
- `POST /api/v1/ai/personalize` - Personalize email content for contacts
- `POST /api/v1/ai/analyze-performance` - Analyze email performance with AI insights
- `POST /api/v1/ai/health` - Check AI service status

#### Analytics & Reporting
- `GET /api/v1/analytics/campaign-metrics` - Get campaign performance metrics
- `GET /api/v1/analytics/time-series` - Get time series data for campaigns
- `GET /api/v1/analytics/segmentation` - Get segmentation metrics
- `GET /api/v1/analytics/predictive-insights` - Get predictive insights for campaigns
- `GET /api/v1/analytics/performance-comparison` - Compare performance between time periods
- `GET /api/v1/analytics/top-performers` - Get top performing campaigns by metric
- `GET /api/v1/analytics/engagement-heatmap` - Get engagement heatmap data
- `GET /api/v1/analytics/dashboard-summary` - Get comprehensive dashboard summary
- `GET /api/v1/analytics/export` - Export analytics data (CSV/JSON)

#### Compliance & Deliverability
- `GET /api/v1/compliance/domains/:domainId/compliance` - Check domain compliance status
- `POST /api/v1/compliance/spam-score` - Calculate spam score for email content
- `GET /api/v1/compliance/health` - Check compliance service health
- `GET /api/v1/deliverability/domains/:domainId/metrics` - Get domain deliverability metrics
- `GET /api/v1/deliverability/domains/:domainId/blacklist-status` - Check domain blacklist status
- `GET /api/v1/deliverability/domains/:domainId/reputation-report` - Generate domain reputation report
- `GET /api/v1/deliverability/domains/:domainId/optimize` - Get deliverability optimization recommendations
- `GET /api/v1/deliverability/health` - Check deliverability service health

#### Enterprise Features
- `POST /api/v1/workflows` - Create custom workflow
- `GET /api/v1/workflows` - Get organization workflows
- `PUT /api/v1/workflows/:id` - Update workflow
- `DELETE /api/v1/workflows/:id` - Delete workflow
- `POST /api/v1/workflows/:id/execute` - Execute workflow
- `GET /api/v1/workflows/:id/executions` - Get workflow executions
- `GET /api/v1/enterprise/organizations` - Get all organizations (enterprise only)
- `POST /api/v1/enterprise/organizations` - Create new organization (enterprise only)
- `GET /api/v1/enterprise/security/audit-logs` - Get security audit logs
- `GET /api/v1/enterprise/security/active-sessions` - Get active user sessions
- `POST /api/v1/enterprise/security/terminate-session/:sessionId` - Terminate user session
- `GET /api/v1/enterprise/analytics/enterprise-overview` - Get enterprise analytics overview

## 🗄️ Database Schema

### Core Tables

- **organizations**: Multi-tenant organization structure
- **users**: User accounts with role-based permissions
- **mailboxes**: SMTP configuration and credentials
- **domains**: Domain verification and DNS records
- **campaigns**: Email campaign definitions
- **contacts**: Contact lists and segmentation
- **emails**: Email tracking and analytics

### Key Relationships

```
Organization (1) ── (N) User
Organization (1) ── (N) Mailbox
Organization (1) ── (N) Domain
Organization (1) ── (N) Campaign
Campaign (1) ── (N) Contact
Campaign (1) ── (N) Email
```

## 🔐 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Role-Based Access Control**: Hierarchical permission system
- **Password Hashing**: Bcrypt with configurable rounds
- **Rate Limiting**: API request throttling
- **CORS Protection**: Configurable cross-origin policies
- **Helmet**: Security headers middleware
- **Input Validation**: Class-validator with DTOs

## 📊 Monitoring & Health

- **Health Checks**: Database, Redis, and system health
- **Metrics**: Request/response monitoring
- **Logging**: Structured logging with configurable levels
- **Error Handling**: Global exception filters

## 🧪 Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov

# Watch mode
npm run test:watch
```

## 🚀 Deployment

### Production Environment

1. **Set environment variables** for production
2. **Build the application**: `npm run build`
3. **Deploy to your preferred platform** (AWS, GCP, Azure)
4. **Set up CI/CD pipeline** using GitHub Actions

### Docker Production

```bash
# Build production image
docker build -f apps/api/Dockerfile -t coldmail-saas:latest .

# Run with production environment
docker run -p 3000:3000 --env-file .env.prod coldmail-saas:latest
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [API Docs](http://localhost:3000/api/docs)
- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-repo/discussions)

## 🗺️ Roadmap

### Phase 1: Foundation ✅
- [x] Project structure and configuration
- [x] Basic authentication and user management
- [x] Multi-tenant organization system
- [x] Database schema and entities
- [x] Docker development environment

### Phase 2: Core Platform Backbone ✅
- [x] Complete authentication system
- [x] User invitation and team management
- [x] Organization settings and limits
- [x] Role-based access control
- [x] Email service for verification and invitations
- [x] Comprehensive permissions system
- [x] Team management structure

### Phase 3: Mailbox & Domain Infrastructure ✅
- [x] Domain verification system
- [x] SMTP mailbox management
- [x] DNS record automation
- [x] IP pool management

### Phase 4: Email Sending Engine ✅
- [x] Campaign creation and management
- [x] Email sequence automation
- [x] SMTP integration and fallback
- [x] Basic tracking and analytics

### Phase 5: AI & Personalization ✅
- [x] OpenAI integration for content generation
- [x] AI-powered subject line suggestions
- [x] Dynamic variable system for personalization
- [x] A/B testing framework for campaigns
- [x] AI-powered email performance analysis
- [x] Content personalization engine

### Phase 6: Advanced Analytics & Reporting ✅
- [x] Real-time campaign dashboards
- [x] Advanced segmentation and targeting
- [x] Predictive analytics for engagement
- [x] Custom report builder
- [x] Data export and integration
- [x] Performance comparison tools
- [x] Engagement heatmaps
- [x] ROI and conversion tracking

### Phase 7: Compliance & Deliverability ✅
- [x] Advanced spam detection
- [x] Email authentication (SPF, DKIM, DMARC)
- [x] Compliance monitoring and reporting
- [x] Blacklist monitoring and management
- [x] Deliverability optimization

### Phase 8: Enterprise Features ✅
- [x] Multi-organization management
- [x] Advanced team collaboration
- [x] Custom workflows and automation
- [x] API rate limiting and quotas
- [x] Advanced security features

### Phase 9: Mobile & Frontend 📋
- [ ] React-based admin dashboard
- [ ] Mobile-responsive design
- [ ] Real-time notifications
- [ ] Advanced campaign builder UI
- [ ] Analytics visualization

### Phase 10: Production & Scaling 📋
- [ ] Kubernetes deployment
- [ ] Auto-scaling configuration
- [ ] Advanced monitoring and alerting
- [ ] Performance optimization
- [ ] Production security hardening

---

**Built with ❤️ using NestJS and modern web technologies**
