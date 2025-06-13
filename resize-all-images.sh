#!/bin/bash

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo "ImageMagick is not installed. Installing..."
    brew install imagemagick
fi

# Create a directory for backups if it doesn't exist
mkdir -p metadata/backups

# Find all PNG files in the metadata directory
for image in metadata/*.png; do
    # Get just the filename
    filename=$(basename "$image")
    
    # Create a backup of the original image
    cp "$image" "metadata/backups/$filename.backup"
    
    echo "Resizing $image..."
    # Resize the image to the required dimensions: 2000x1250 pixels
    convert "$image" -resize 2000x1250 -background white -gravity center -extent 2000x1250 "$image"
    
    echo "Image $filename resized successfully to 2000x1250 pixels."
done

echo "All images have been resized to 2000x1250 pixels."
echo "Backups of the original images are saved in metadata/backups/"
