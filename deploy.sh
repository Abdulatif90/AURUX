#!/bin/bash
set -e

#production  script

#1. Local ozgarishlarni saqlash
git stash

#2 eng songgi codelarni olish
git reset --hard
git checkout master
git pull origin master

#3. continerlarni qayta ishga tushirish
docker compose down
docker compose up -d --build

#4 health check
sleep 10
curl -f http://localhost:4001/health

