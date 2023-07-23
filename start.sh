#!/bin/bash

# Start the first process
python3.11 /app/webssh/run.py &

# Start the second process
npm run start &

# Wait for any process to exit
wait -n

# Exit with status of process that exited first
exit $?