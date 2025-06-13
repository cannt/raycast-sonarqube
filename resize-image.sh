#!/bin/bash

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo "ImageMagick is not installed. Installing..."
    brew install imagemagick
fi

# Create a backup of the original image
cp metadata/screenshot-add-project.png metadata/screenshot-add-project.png.backup

# Resize the image to the required dimensions: 2000x1250 pixels
convert metadata/screenshot-add-project.png -resize 2000x1250 -background white -gravity center -extent 2000x1250 metadata/screenshot-add-project.png

echo "Image resized successfully to 2000x1250 pixels."
echo "A backup of the original image is saved as metadata/screenshot-add-project.png.backup"
