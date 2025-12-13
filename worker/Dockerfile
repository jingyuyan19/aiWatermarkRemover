# Use RunPod's official PyTorch base image (has ffmpeg and git pre-installed)
# Using Python 3.10 with PyTorch 2.1 (slightly older but stable and battle-tested on RunPod)
FROM runpod/pytorch:2.1.0-py3.10-cuda11.8.0-devel

WORKDIR /app

# Copy requirements
COPY requirements.txt .

# Install mmcv-full from pre-built wheel (much faster than compiling)
RUN pip install mmcv-full==1.7.2 -f https://download.openmmlab.com/mmcv/dist/cu118/torch2.1/index.html

# Install ffmpeg (provides ffprobe)
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

# Install python dependencies using Tsinghua mirror (faster in China)
# Install python dependencies using Tsinghua mirror (faster in China)
RUN pip install --no-cache-dir -r requirements.txt

# Bake models into image (Zero-Latency Startup)
RUN mkdir -p /app/demark_world_code/resources/checkpoint/
RUN wget -O /app/demark_world_code/resources/checkpoint/E2FGVI-HQ-CVPR22.pth https://github.com/linkedlist771/SoraWatermarkCleaner/releases/download/V0.0.1/E2FGVI-HQ-CVPR22.pth
RUN wget -O /app/demark_world_code/resources/checkpoint/spynet_20210409-c6c1bd09.pth https://download.openmmlab.com/mmediting/restorers/basicvsr/spynet_20210409-c6c1bd09.pth
RUN wget -O /app/demark_world_code/resources/checkpoint/watermark-best.pt https://github.com/linkedlist771/DeMark-World/releases/download/V0.0.1/watermark-best.pt

# Copy application code
# Copy application code
COPY demark_world /app/demark_world_code
COPY handler.py /app/handler.py

# Set python path to include demark_world/src
ENV PYTHONPATH=/app/demark_world_code/src

# RunPod serverless entrypoint
CMD ["python", "-u", "handler.py"]
