#!/bin/bash
cd /home/david/Desktop/Diplomovka/git/practical/backend
source venv/bin/activate
python3 src/rag_pipeline.py "$@"