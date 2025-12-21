# MongoDB Atlas Setup Guide

This guide will help you set up MongoDB Atlas for the Ha Hootz application.

## Step 1: Create a MongoDB Atlas Account

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register)
2. Sign up for a free account (M0 Free Tier is perfect for development)

## Step 2: Create a Cluster

1. After logging in, click "Build a Database"
2. Choose the **FREE** (M0) tier
3. Select a cloud provider and region (choose one closest to you)
4. Give your cluster a name (e.g., "ha-hootz-cluster")
5. Click "Create"

## Step 3: Create a Database User

1. In the Security section, click "Database Access"
2. Click "Add New Database User"
3. Choose "Password" authentication
4. Create a username and password (save these securely!)
5. Set user privileges to "Atlas admin" (for development) or create a custom role
6. Click "Add User"

## Step 4: Configure Network Access

1. In the Security section, click "Network Access"
2. Click "Add IP Address"
3. For development, click "Allow Access from Anywhere" (0.0.0.0/0)
   - **Note**: For production, restrict this to your server's IP address
4. Click "Confirm"

## Step 5: Get Your Connection String

1. Click "Database" in the left sidebar
2. Click "Connect" on your cluster
3. Choose "Connect your application"
4. Select "Node.js" and version "5.5 or later"
5. Copy the connection string (it looks like: `mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority`)

## Step 6: Configure Environment Variables

1. Create a `.env.local` file in the root of your project:

```env
# MongoDB Atlas Connection String
# Replace <username> and <password> with your database user credentials
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority

# MongoDB Database Name (optional, defaults to 'ha-hootz')
MONGODB_DB_NAME=ha-hootz

# NextAuth.js Secret
# Generate a random string: openssl rand -base64 32
NEXTAUTH_SECRET=your_generated_secret_here

# NextAuth.js URL
NEXTAUTH_URL=http://localhost:3000
```

2. Replace the placeholders:
   - `<username>`: Your database username
   - `<password>`: Your database password
   - `your_generated_secret_here`: Generate a secret using `openssl rand -base64 32`

## Step 7: Test the Connection

1. Start your development server: `npm run dev`
2. Try creating an account at `http://localhost:3000/auth/signup`
3. If successful, you should see your user in MongoDB Atlas under "Browse Collections"

## Troubleshooting

### Connection Timeout
- Check that your IP address is whitelisted in Network Access
- Verify your connection string is correct
- Ensure your password doesn't contain special characters that need URL encoding

### Authentication Failed
- Double-check your username and password
- Make sure you URL-encoded any special characters in the password
- Verify the database user has proper permissions

### Database Not Found
- The database will be created automatically when you first save data
- Make sure `MONGODB_DB_NAME` matches your intended database name

## Production Considerations

1. **Security**:
   - Use environment-specific connection strings
   - Restrict Network Access to your server's IP only
   - Use a strong `NEXTAUTH_SECRET` (generate with `openssl rand -base64 32`)
   - Never commit `.env.local` to version control

2. **Performance**:
   - Consider upgrading from M0 to a paid tier for production
   - Enable MongoDB Atlas monitoring and alerts
   - Set up database indexes for frequently queried fields

3. **Backup**:
   - Enable automated backups in MongoDB Atlas
   - Set up regular backup verification

## Collections Created

The application will automatically create two collections:

1. **users**: Stores user accounts with email, hashed password, and profile info
2. **presentations**: Stores trivia game presentations linked to user IDs

