#!/bin/bash

echo "================================================"
echo "StepSight AI - Backend Installation (Mac/Linux)"
echo "================================================"
echo ""

echo "Installing Python dependencies..."
pip3 install flask flask-cors pillow numpy opencv-python pydicom
echo ""

echo "Optional: Installing TensorFlow (this may take a while)..."
pip3 install tensorflow
echo ""

echo "================================================"
echo "Installation Complete!"
echo "================================================"
echo ""
echo "To start the server, run: python3 app.py"
echo ""