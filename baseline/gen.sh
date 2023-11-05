#!/bin/sh
PATH="$(pwd)/bin:$PATH" protoc --experimental_allow_proto3_optional -I=. --go_out=. example.proto
