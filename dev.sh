#!/bin/bash
# TMUX session setup for TreeChat development
# This script creates a tmux session with backend and frontend side by side

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SESSION_NAME="treechat"

# Check if already inside a tmux session
if [ -n "$TMUX" ]; then
  # Get current window and pane
  CURRENT_WINDOW=$(tmux display-message -p '#{window_id}')
  CURRENT_PANE=$(tmux display-message -p '#{pane_id}')

  # Split current window horizontally
  tmux split-window -h -t "$CURRENT_WINDOW"

  # Backend in left pane (current pane - stays as current)
  RIGHT_PANE=$(tmux display-message -p '#{pane_id}')

  # Select left pane (original pane)
  tmux select-pane -t "$CURRENT_PANE"

  tmux send-keys -t "$CURRENT_PANE" 'echo "Starting Backend..."' C-m
  tmux send-keys -t "$CURRENT_PANE" "cd \"$SCRIPT_DIR/server\"" C-m
  tmux send-keys -t "$CURRENT_PANE" 'PYTHONPATH="$PYTHONPATH:.." uv run python ../run_server.py' C-m

  # Frontend in right pane (new pane)
  tmux send-keys -t "$RIGHT_PANE" 'echo "Starting Frontend..."' C-m
  tmux send-keys -t "$RIGHT_PANE" 'cd client' C-m
  tmux send-keys -t "$RIGHT_PANE" 'npm run dev' C-m

  exit 0
fi

# Check if session already exists
if tmux has-session -t $SESSION_NAME 2>/dev/null; then
  echo "Session '$SESSION_NAME' already exists. Attaching..."
  tmux attach-session -t $SESSION_NAME
  exit 0
fi

# Create a new session with a window named "dev"
tmux new-session -d -s $SESSION_NAME -n "dev"

# Split the window vertically (50% each)
tmux split-window -h -t $SESSION_NAME:0

# Set up backend pane (left)
tmux select-pane -t $SESSION_NAME:0.0
tmux send-keys -t $SESSION_NAME:0.0 'echo "Starting Backend..."' C-m
tmux send-keys -t $SESSION_NAME:0.0 "cd \"$SCRIPT_DIR/server\"" C-m
tmux send-keys -t $SESSION_NAME:0.0 'PYTHONPATH="$PYTHONPATH:.." uv run python ../run_server.py' C-m

# Set up frontend pane (right)
tmux select-pane -t $SESSION_NAME:0.1
tmux send-keys -t $SESSION_NAME:0.1 'echo "Starting Frontend..."' C-m
tmux send-keys -t $SESSION_NAME:0.1 'cd client' C-m
tmux send-keys -t $SESSION_NAME:0.1 'npm run dev' C-m

# Go back to backend pane
tmux select-pane -t $SESSION_NAME:0.0

# Attach to the session
tmux attach-session -t $SESSION_NAME
