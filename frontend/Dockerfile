FROM node:20-alpine

WORKDIR /app

# Copy the package.json and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the application
COPY . .

# Build the frontend (if needed for your server.ts setup)
RUN npm run build

# Expose the port specified in docker-compose.yml
EXPOSE 3000

# Run the frontend server (uses dev script which executes 'tsx server.ts' per your package.json)
# Note: For production, you might want a distinct production start script 
CMD ["npm", "run", "dev"]
