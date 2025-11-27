# Build container just to run npm stuff
FROM node:22 AS npm_build

WORKDIR /app

# Copy files
ADD . .

# Install node dependencies and build vite app
RUN npm install && npm run build

# Prod container to run python app
FROM python:3.11-slim

# Define simple variable to skip opening browser in container
ENV IN_DOCKER=true

# Where the data will be stored in the container
VOLUME /data

# Define working directory
WORKDIR /app

# Copy files
ADD . .
COPY --from=npm_build /app/dist dist

# Install python dependencies
RUN pip install -r requirements.txt

EXPOSE 8000

ENTRYPOINT ["python", "-m", "uvicorn", "tools.api:app", "--host", "0.0.0.0", "--port", "8000"]
