#!/bin/bash
source /app/.env
cd /app
export PYTHONPATH=$PYTHONPATH:/app
echo "Running Alembic..."
alembic revision --autogenerate -m "Add analysis_note column"
alembic upgrade head
echo "Done"
