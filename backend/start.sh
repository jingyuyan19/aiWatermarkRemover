#!/bin/bash
# Run database migration fix
python migrate_fix.py

uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
