FROM python:3.11-slim

# System deps required for CmdStan
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    g++ \
    make \
    wget \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python deps first (cache-friendly)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Explicitly install CmdStan
RUN python -c "from cmdstanpy import install_cmdstan; install_cmdstan(cores=2)"

# Copy app
COPY . .

ENV PYTHONUNBUFFERED=1
ENV CMDSTAN=/root/.cmdstan/cmdstan-2.34.1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
