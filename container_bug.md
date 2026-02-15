# Navigate to project directory
cd /var/www/MYcardPROD

# Pull latest changes
git pull origin main

# Stop admin frontend container
docker-compose stop admin_frontend

# Remove admin frontend container
docker-compose rm -f admin_frontend

# Find and remove the old admin_frontend image
docker images | grep admin_frontend

# Copy the IMAGE ID from the output, then remove it:
docker rmi <IMAGE_ID>

# Rebuild admin frontend with no cache
docker-compose build --no-cache admin_frontend

# Start admin frontend container
docker-compose up -d admin_frontend

# Verify it's running
docker-compose ps
docker logs react_admin_frontend --tail 20