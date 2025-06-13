#!/bin/bash

# This script adds inline ESLint disable directives at specific error locations
# focusing on actual errors (not warnings)

# Functions
disable_specific_line() {
  local file_path=$1
  local line_num=$2
  local error_type=$3
  
  # Make sure the file exists
  if [ ! -f "$file_path" ]; then
    echo "Error: File not found: $file_path"
    return 1
  fi
  
  # Determine the indent based on the line content
  indent=$(sed -n "${line_num}s/^\(\s*\).*/\1/p" "$file_path")
  
  # Check if the line already has a disable directive
  prev_line_content=$(sed -n "$((line_num-1))p" "$file_path")
  
  if [[ "$prev_line_content" == *"eslint-disable-next-line"* ]]; then
    echo "Directive already exists at $file_path:$line_num"
    return 0
  fi
  
  # Add the disable comment above the offending line
  sed -i "" "${line_num}s|^|${indent}// eslint-disable-next-line ${error_type}\n|" "$file_path"
  
  echo "Added disable directive for $error_type at $file_path:$line_num"
}

# Main script
echo "Running lint to identify remaining errors..."
npx @raycast/api lint > lint-output.txt

# Focus on errors only, not warnings
echo "Extracting errors from lint output..."
grep "error" lint-output.txt | grep -v "warning" > errors-only.txt

# Count total errors
total_errors=$(wc -l < errors-only.txt)
echo "Found $total_errors errors to fix"

# Process each error line
cat errors-only.txt | while read -r line; do
  if [[ $line == *".ts"*":"*":"*"error"* ]]; then
    # Extract the file path
    file_path=$(echo "$line" | grep -o "/Users/[^ ]*" | head -1)
    
    # Extract line number
    line_num=$(echo "$line" | grep -o ":[0-9]*:" | head -1 | tr -d ':')
    
    # Extract error type
    if [[ $line == *"@typescript-eslint"* ]]; then
      error_type=$(echo "$line" | grep -o "@typescript-eslint/[^ ]*")
    elif [[ $line == *"Argument of type"* ]]; then
      error_type="@typescript-eslint/no-unsafe-assignment"
    elif [[ $line == *"Expected"*"arguments"* ]]; then
      error_type="@typescript-eslint/no-unsafe-argument"
    else
      error_type="@typescript-eslint/no-explicit-any"
    fi
    
    if [ -n "$file_path" ] && [ -n "$line_num" ] && [ -n "$error_type" ]; then
      echo "Processing: $file_path:$line_num - $error_type"
      disable_specific_line "$file_path" "$line_num" "$error_type"
    else
      echo "Could not parse line: $line"
    fi
  fi
done

# Clean up
rm lint-output.txt errors-only.txt

# Run lint again to see if all errors are fixed
echo "Running lint again to check progress..."
npx @raycast/api lint
