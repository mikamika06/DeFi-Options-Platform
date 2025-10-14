#!/bin/bash

# Start all workers in background
echo "Starting all workers..."

# Set working directory
cd "$(dirname "$0")"

# Start workers in background
NODE_ENV=development tsx workers/risk-engine.ts &
NODE_ENV=development tsx workers/settlement-worker.ts &
NODE_ENV=development tsx workers/liquidation-worker.ts &
NODE_ENV=development tsx workers/margin-worker.ts &
NODE_ENV=development tsx workers/iv-publisher.ts &
NODE_ENV=development tsx workers/greeks-worker.ts &
NODE_ENV=development tsx workers/settlement-scheduler.ts &
NODE_ENV=development tsx workers/event-indexer.ts &

echo "All workers started in background"
echo "To stop all workers, run: pkill -f 'tsx workers'"

# Keep script running
wait