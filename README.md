# Unyva Backend

## Running the Backend Server

The backend has been experiencing stability issues on Windows. Here are several ways to run it:

### Option 1: Windows Batch Script (Most Stable)
```bash
cd unyva-backend
npm run dev:windows
```
Or directly:
```bash
cd unyva-backend
./run-dev.bat
```
This script will automatically restart the server if it crashes.

### Option 2: Simple Dev Mode
```bash
cd unyva-backend
npm run dev:simple
```
This runs the server once without auto-restart.

### Option 3: Nodemon Watch Mode
```bash
cd unyva-backend
npm run dev:watch
```
This uses nodemon to watch for file changes and auto-restart.

### Option 4: Standard Nodemon
```bash
cd unyva-backend
npm run dev
```

## Troubleshooting

### Server Stops Immediately
If the server stops right after starting:
1. Check if port 5000 is already in use
2. Make sure PostgreSQL is running
3. Check your `.env` file has correct database credentials

### TypeScript Errors
If you see TypeScript compilation errors:
1. Try deleting `node_modules` and running `npm install` again
2. Make sure all imports end with `.js` extension (even for TypeScript files)

### Database Connection Issues
If you see database connection errors:
1. Verify PostgreSQL is running
2. Check `.env` file has correct credentials:
   ```
   DB_USER=your_user
   DB_PASSWORD=your_password
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=unyva_db
   ```

### Port Already in Use
If port 5000 is already in use:
1. Find the process: `netstat -ano | findstr :5000`
2. Kill it: `taskkill /PID <process_id> /F`
3. Or change the port in `.env`: `PORT=5001`

## Environment Variables

Create a `.env` file in the backend directory with:
```
PORT=5000
HOST=0.0.0.0
DB_USER=postgres
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432
DB_NAME=unyva_db
JWT_SECRET=your-secret-key
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
BASE_URL=http://localhost:5000
```

## API Endpoints

- `GET /api/test` - Test endpoint
- `POST /api/students/register-step1` - Register step 1
- `POST /api/students/register-step2` - Register step 2 with file uploads
- `POST /api/students/login` - Student login
- `GET /api/students/profile` - Get logged-in student profile (requires auth)
- `GET /api/students/verify-email?token=xxx` - Verify email