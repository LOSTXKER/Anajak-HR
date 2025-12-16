#!/bin/bash

# Script to generate PWA icons from existing PNG files
# Uses sips (macOS built-in tool)

echo "🎨 Generating PWA Icons from PNG..."

SOURCE_512="public/icons/icon-512x512.png"
OUTPUT_DIR="public/icons"

# Check if source file exists
if [ ! -f "$SOURCE_512" ]; then
    echo "❌ Source file not found: $SOURCE_512"
    exit 1
fi

# Create output directory if it doesn't exist
mkdir -p "$OUTPUT_DIR"

# Icon sizes (excluding 192 and 512 which we already have)
sizes=(72 96 128 144 152 384)

echo "Using source: $SOURCE_512"
echo ""

# Generate icons using sips (macOS built-in tool)
for size in "${sizes[@]}"; do
    output="$OUTPUT_DIR/icon-${size}x${size}.png"
    echo "Generating ${size}x${size}..."
    sips -z $size $size "$SOURCE_512" --out "$output" > /dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        echo "✅ Created: icon-${size}x${size}.png"
    else
        echo "❌ Failed to create: icon-${size}x${size}.png"
    fi
done

echo ""
echo "✨ Done! Generated ${#sizes[@]} icons."
echo ""
echo "📁 All icons:"
ls -lh "$OUTPUT_DIR"/icon-*.png 2>/dev/null | awk '{print "  " $9 " (" $5 ")"}'
echo ""
echo "✅ Ready to use! Run 'npm run build' to test."

