#!/bin/bash
# api/scripts/wait-for-db.sh
# Helper script to wait for Postgres to be ready

set -e

host="$1"
shift
cmd="$@"

until PGPASSWORD=postgres psql -h "$host" -U "postgres" -d "demand_navigator" -c '\q'; do
  >&2 echo "Postgres is unavailable - sleeping"
  sleep 1
done

>&2 echo "Postgres is up - executing command"
exec $cmd
