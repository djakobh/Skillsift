# code execution container - runs python and c++ in isolation
FROM python:3.11-slim

# install c++ compiler
RUN apt-get update && apt-get install -y g++ && rm -rf /var/lib/apt/lists/*

# install flask for the api server
RUN pip install flask

WORKDIR /app
COPY server.py .

# flask server listens on port 5000
EXPOSE 5000
CMD ["python", "server.py"]
