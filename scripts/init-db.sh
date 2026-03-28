#!/bin/sh
# Create the mcp_mail database if it doesn't exist yet.
# The hydra database is created by POSTGRES_DB in the compose file.
set -e
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
  SELECT 'CREATE DATABASE mcp_mail'
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'mcp_mail')\gexec
EOSQL
