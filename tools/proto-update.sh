#!/bin/sh
# Fetch the latest proto files from the RabiRiichi-Proto git submodule.
set -e
git submodule update --init --remote
