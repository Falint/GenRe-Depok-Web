#!/usr/bin/env bash
# Legacy seed is retired: users register a verified Gmail and start as guests.
# Role assignment belongs to the dedicated administrator, never signup metadata.
set -euo pipefail
printf '%s\n' 'Seed akun buatan dinonaktifkan. Daftar melalui /daftar; lihat docs/AUTH_ROLLOUT.md untuk bootstrap admin.' >&2
exit 1
