#!/bin/bash

# Script to generate PWA icons from favicon.svg
# Requires: ImageMagick (brew install imagemagick)

echo "🎨 Generating PWA Icons..."

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo "❌ ImageMagick is not installed."
    echo "Please install it first:"
    echo "  macOS: brew install imagemagick"
    echo "  Ubuntu: sudo apt-get install imagemagick"
    exit 1
fi

# Source file
SOURCE="public/favicon.svg"
OUTPUT_DIR="public/icons"

# Check if source file exists
if [ ! -f "$SOURCE" ]; then
    echo "❌ Source file not found: $SOURCE"
    echo "Please make sure favicon.svg exists in public/ folder"
    exit 1
fi

# Create output directory if it doesn't exist
mkdir -p "$OUTPUT_DIR"

# Icon sizes
sizes=(72 96 128 144 152 192 384 512)

# Generate icons
for size in "${sizes[@]}"; do
    output="$OUTPUT_DIR/icon-${size}x${size}.png"
    echo "Generating ${size}x${size}..."
    convert -background none -resize ${size}x${size} "$SOURCE" "$output"
    
    if [ $? -eq 0 ]; then
        echo "✅ Created: $output"
    else
        echo "❌ Failed to create: $output"
    fi
done

echo ""
echo "✨ Done! Generated ${#sizes[@]} icons."
echo ""
echo "📝 Next steps:"
echo "1. Check the generated icons in public/icons/"
echo "2. If needed, replace them with custom designed icons"
echo "3. Run 'npm run build' to test PWA build"

