#!/usr/bin/env bash

echo starting haproxy service...
service start haproxy
echo starting command handler...
node entrypoint.js

