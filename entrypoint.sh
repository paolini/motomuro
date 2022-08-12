#!/usr/bin/env bash

set -e

node /app/server/server.js | tee --append /logs/log



