TODO:
- rememebr to rename the retriev service name to vector db client


# Knowledge Base Dashboard

A React and Node.js application for managing knowledge base entries.

## Running with Docker

This project is containerized with Docker for easy setup and deployment.

### Prerequisites

- Docker
- Docker Compose

### Running the Application

1. Clone the repository
2. Navigate to the project directory
3. Run the following command to start both the frontend and backend:

```bash
docker-compose up
```

4. Access the application at http://localhost:5173

### Development

If you want to run the application in development mode without Docker:

```bash
npm install
npm start
```

This will start both the backend server and the frontend development server concurrently.

## Project Structure

- `server/`: Backend Node.js/Express API
- `src/`: Frontend React application
- `Dockerfile.client`: Docker configuration for the frontend
- `Dockerfile.server`: Docker configuration for the backend
- `docker-compose.yml`: Docker Compose configuration for orchestrating both services