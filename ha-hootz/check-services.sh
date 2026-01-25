#!/bin/bash

# Check and start required services (Docker, Redis, MongoDB)
# Run this before testing your deployment

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "🔍 Checking required services..."
echo ""

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if a port is in use
port_in_use() {
    lsof -i :"$1" >/dev/null 2>&1
}

# 1. Check Docker
echo "🐳 Checking Docker..."
if command_exists docker; then
    if docker info >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Docker is running${NC}"
        echo "   Version: $(docker --version)"
    else
        echo -e "${RED}❌ Docker is installed but not running${NC}"
        echo ""
        echo "   To start Docker:"
        echo "   - macOS: Open Docker Desktop application"
        echo "   - Linux: sudo systemctl start docker"
        echo ""
        read -p "   Would you like to open Docker Desktop now? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            open -a Docker 2>/dev/null || echo "   Please start Docker Desktop manually"
        fi
    fi
else
    echo -e "${YELLOW}⚠️  Docker is not installed${NC}"
    echo "   Install: https://www.docker.com/products/docker-desktop"
fi
echo ""

# 2. Check Redis
echo "🔴 Checking Redis..."
if command_exists redis-cli; then
    if redis-cli ping >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Redis is running${NC}"
        echo "   Response: $(redis-cli ping)"
        echo "   Port: 6379"
    else
        echo -e "${RED}❌ Redis is installed but not running${NC}"
        echo ""
        echo "   To start Redis:"
        if [[ "$OSTYPE" == "darwin"* ]]; then
            echo "   macOS: brew services start redis"
        elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
            echo "   Linux: sudo systemctl start redis"
        fi
        echo ""
        read -p "   Would you like to start Redis now? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            if [[ "$OSTYPE" == "darwin"* ]]; then
                brew services start redis
                sleep 2
                if redis-cli ping >/dev/null 2>&1; then
                    echo -e "${GREEN}✅ Redis started successfully${NC}"
                else
                    echo -e "${RED}❌ Failed to start Redis${NC}"
                fi
            elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
                sudo systemctl start redis
                sleep 2
                if redis-cli ping >/dev/null 2>&1; then
                    echo -e "${GREEN}✅ Redis started successfully${NC}"
                else
                    echo -e "${RED}❌ Failed to start Redis${NC}"
                fi
            fi
        fi
    fi
else
    echo -e "${YELLOW}⚠️  Redis is not installed${NC}"
    echo ""
    echo "   To install Redis:"
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "   macOS: brew install redis"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        echo "   Linux: sudo apt-get install redis-server"
    fi
fi
echo ""

# 3. Check MongoDB
echo "🍃 Checking MongoDB..."
if command_exists mongosh || command_exists mongo; then
    MONGO_CMD="mongosh"
    if ! command_exists mongosh; then
        MONGO_CMD="mongo"
    fi
    
    # Try to connect to local MongoDB
    if $MONGO_CMD --eval "db.adminCommand('ping')" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ MongoDB is running locally${NC}"
        echo "   Port: 27017"
    else
        echo -e "${YELLOW}⚠️  MongoDB is not running locally${NC}"
        echo "   (This is OK if you're using MongoDB Atlas)"
    fi
else
    echo -e "${YELLOW}⚠️  MongoDB CLI is not installed${NC}"
    echo "   (This is OK if you're using MongoDB Atlas)"
fi

# Check if MongoDB Atlas connection string is set
if [ -f .env.local ]; then
    if grep -q "MONGODB_URI.*mongodb\+srv" .env.local; then
        echo -e "${GREEN}✅ MongoDB Atlas URI found in .env.local${NC}"
        echo "   Using cloud MongoDB (MongoDB Atlas)"
    elif grep -q "MONGODB_URI.*localhost" .env.local; then
        echo -e "${YELLOW}⚠️  Local MongoDB URI found${NC}"
        echo "   Make sure MongoDB is running locally"
    fi
fi
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Summary:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Docker status
if command_exists docker && docker info >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Docker: Running${NC}"
else
    echo -e "${RED}❌ Docker: Not running${NC}"
fi

# Redis status
if command_exists redis-cli && redis-cli ping >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Redis: Running${NC}"
else
    echo -e "${RED}❌ Redis: Not running${NC}"
fi

# MongoDB status
if [ -f .env.local ] && grep -q "MONGODB_URI.*mongodb\+srv" .env.local; then
    echo -e "${GREEN}✅ MongoDB: Using Atlas (cloud)${NC}"
elif command_exists mongosh && mongosh --eval "db.adminCommand('ping')" >/dev/null 2>&1 2>/dev/null; then
    echo -e "${GREEN}✅ MongoDB: Running locally${NC}"
else
    echo -e "${YELLOW}⚠️  MongoDB: Check connection${NC}"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Quick commands reference
echo "📚 Quick Commands:"
echo ""
echo "  Check services:     ./check-services.sh"
echo "  Start Redis:         brew services start redis"
echo "  Stop Redis:          brew services stop redis"
echo "  Start Docker:        open -a Docker"
echo "  Test Redis:          redis-cli ping"
echo "  Test MongoDB:        mongosh --eval 'db.adminCommand(\"ping\")'"
echo ""
