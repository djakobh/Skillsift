# code execution container - runs python and c++ in isolation
FROM python:3.11-slim

# install c++ compiler
RUN apt-get update && apt-get install -y g++ && rm -rf /var/lib/apt/lists/*

# install flask and gunicorn for the api server
RUN pip install flask gunicorn

WORKDIR /app
COPY server.py .

EXPOSE 5000
CMD ["sh", "-c", "gunicorn --bind 0.0.0.0:${PORT:-5000} --workers 2 server:app"]
