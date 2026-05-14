# Unity Drop API - Backend System

## What This Backend Does

Unity Drop API is the brain of our blood donation system. It handles all the important work behind the scenes to connect blood donors with patients who need blood urgently.

### Main Jobs:
- **User Management**: Registers and logs in donors, patients, and admin users
- **Blood Matching**: Finds the right donors for patients based on blood type and location
- **Request Handling**: Manages blood requests from patients and donor responses
- **Admin Control**: Allows admins to approve new users and manage the system
- **Email Services**: Sends verification emails and notifications
- **Security**: Keeps all user data safe and secure

## How It Works

### 1. User Registration & Login
- New users sign up with their email and password
- System sends an OTP (One-Time Password) to verify email
- After verification, users can log in securely
- Three types of users: Donors, Patients, and Admins

### 2. Blood Donation Process
- Patients create blood requests with their blood type and location
- System finds matching donors nearby using smart algorithms
- Donors receive notifications and can respond to requests
- Admins monitor and manage all requests

### 3. Security Features
- Passwords are encrypted for safety
- JWT tokens keep user sessions secure
- Rate limiting prevents abuse
- All data is validated and cleaned

## Technology Used

- **Node.js**: The server runtime environment
- **Express.js**: Web framework to handle API requests
- **MongoDB**: Database to store all user and request data
- **JWT**: For secure user authentication
- **bcryptjs**: For password encryption
- **Nodemailer**: For sending emails
- **Winston**: For logging system events

## Project Structure

```
unity-drop-api/
├── src/
│   ├── app.js                 # Main application setup
│   ├── config/                # Configuration files
│   ├── controllers/           # Business logic for each feature
│   ├── lib/                   # Helper functions
│   ├── middlewares/           # Security and processing functions
│   ├── models/                # Database models
│   ├── routes/                # API endpoints
│   ├── services/              # Core business services
│   └── utils/                 # Utility functions
├── tests/                     # Test files
├── logs/                      # System logs
└── server.js                  # Server starting point
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - New user registration
- `POST /api/auth/login` - User login
- `POST /api/auth/verify-otp` - Email verification
- `POST /api/auth/forgot-password` - Password reset

### Donor Operations
- `GET /api/donor/profile` - Get donor information
- `PUT /api/donor/profile` - Update donor profile
- `GET /api/donor/requests` - View blood requests
- `POST /api/donor/respond` - Respond to blood requests

### Patient Operations
- `POST /api/patient/request` - Request blood
- `GET /api/patient/status` - Check request status
- `PUT /api/patient/request` - Update blood request

### Admin Operations
- `GET /api/admin/users` - View all users
- `POST /api/admin/approve` - Approve user registrations
- `GET /api/admin/statistics` - View system statistics

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Setup
Copy `.env.example` to `.env` and fill in your details:
```env
NODE_ENV=development
PORT=8000
MONGODB_URI=mongodb://localhost:27017/unity-drop
JWT_SECRET=your-secret-key-here
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

### 3. Database Setup
- Make sure MongoDB is installed and running
- The app will create the database automatically

### 4. Run the Server
```bash
# For development
npm run dev

# For production
npm start
```

The server will start at `http://localhost:8000`

## Running Tests
```bash
npm test
```

## Deployment Options

### Traditional Server (Render, AWS, etc.)
1. Set environment variables in your hosting platform
2. Run `npm start`

### Serverless (Vercel)
The app is ready for Vercel deployment:
- `vercel.json` handles the routing
- Database connects per request
- Scales automatically with traffic

## Security Features

- **Password Protection**: All passwords are encrypted
- **Session Security**: JWT tokens prevent unauthorized access
- **Input Validation**: All user inputs are checked and cleaned
- **Rate Limiting**: Prevents spam and abuse
- **HTTPS Ready**: Supports secure connections

## Monitoring and Logs

- **Winston Logger**: Creates organized log files
- **Request Tracking**: Logs all API requests
- **Error Handling**: Catches and reports errors
- **Performance Monitoring**: Tracks response times

## Database Information

### Main Collections
- **Users**: Stores donor, patient, and admin information
- **Blood Requests**: Patient blood requests and their status
- **OTP**: Temporary verification codes
- **Feedback**: User feedback and reports

### Performance
- Optimized database indexes for fast searches
- Caching system for frequently used data
- Efficient database connection management

## Common Problems and Solutions

### Database Connection Issues
- Check if MongoDB is running
- Verify the connection string in `.env`
- Make sure the database name is correct

### Email Not Working
- Check email credentials in `.env`
- For Gmail, enable "less secure apps" or use app passwords
- Verify SMTP settings are correct

### Port Already in Use
- The app automatically clears port 8000
- Or manually run: `npx kill-port 8000`

### Health Check
- Visit `http://localhost:8000/health` to check if server is running
- Check the `logs/` folder for detailed error information

## Performance Features

- **Fast Database Queries**: Optimized with MongoDB indexes
- **Smart Caching**: Stores frequently accessed data
- **Efficient Connections**: Manages database connections well
- **Non-blocking Operations**: Handles multiple requests smoothly

## How to Contribute

1. Follow the existing code structure
2. Write tests for new features
3. Update documentation when needed
4. Make sure security rules are followed

## Getting Help

If you run into problems:
- Check the log files in the `logs/` directory
- Verify your `.env` configuration
- Make sure all dependencies are installed
- Check if MongoDB is running properly

## License

This project is licensed under the ISC License.

---

*Built to help save lives through technology* 🩸
