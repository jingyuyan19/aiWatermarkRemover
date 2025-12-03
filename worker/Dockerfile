# Use RunPod's official PyTorch base image (has ffmpeg and git pre-installed)
# Using Python 3.10 with PyTorch 2.1 (slightly older but stable and battle-tested on RunPod)
FROM runpod/pytorch:2.1.0-py3.10-cuda11.8.0-devel

WORKDIR /app

# Copy requirements
COPY requirements.txt .

# Install mmcv-full from pre-built wheel (much faster than compiling)
RUN pip install mmcv-full==1.7.2 -f https://download.openmmlab.com/mmcv/dist/cu118/torch2.1/index.html

# Install python dependencies using Tsinghua mirror (faster in China)
RUN pip config set global.index-url https://pypi.tuna.tsinghua.edu.cn/simple && \
    pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY demark_world /app/demark_world
COPY handler.py /app/handler.py

# Set python path to include demark_world/src
ENV PYTHONPATH=/app/demark_world/src

# RunPod serverless entrypoint
CMD ["python", "-u", "handler.py"]
