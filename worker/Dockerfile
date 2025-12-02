FROM pytorch/pytorch:2.1.0-cuda12.1-cudnn8-runtime

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libgl1-mesa-glx \
    git \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Install python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY demark_world /app/demark_world
COPY handler.py /app/handler.py

# Set python path to include demark_world/src
ENV PYTHONPATH=/app/demark_world/src

# RunPod serverless entrypoint
CMD ["python", "-u", "handler.py"]
