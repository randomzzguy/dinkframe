#!/usr/bin/env bash

set -uo pipefail

project_dir="C:/Users/hhcre/Desktop/DINKFRAME/webapp1.0"
output="$(cd "${project_dir}" && npm run --silent automation:run 2>&1)"
exit_code=$?

if [[ ${exit_code} -ne 0 ]]; then
  printf '%s\n' "${output}"
  exit "${exit_code}"
fi

if [[ "${output}" == *"No DINKFRAME generation jobs are queued."* ]]; then
  exit 0
fi

printf '%s\n' "${output}"
