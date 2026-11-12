#!/bin/sh
# 只在 pgdata 卷为空的首次启动时执行（Postgres 官方镜像的 initdb 机制）。
# 已经有数据后再改这里不会生效，需要手工 psql。
set -eu

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres <<EOSQL
CREATE DATABASE foru OWNER $POSTGRES_USER;
CREATE DATABASE blog OWNER $POSTGRES_USER;
EOSQL
