#!/usr/bin/env bash
# =========================================================================
# Seed 26 akun pengurus Forum GenRe Kota Depok ke Supabase Auth
#
# Prasyarat:
#   1. Sudah jalankan supabase_setup.sql di SQL Editor
#   2. Set environment variables:
#      export SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
#      export SERVICE_ROLE_KEY="your-service-role-key"
#   3. Set SEED_INITIAL_PASSWORD (password sementara kuat, jangan simpan di Git)
#   4. bash seed_users.sh
#
# Trigger membuat profil staff; service role mengisi jabatan dan level setelah akun dibuat.
# =========================================================================

set -euo pipefail

: "${SUPABASE_URL:?Set SUPABASE_URL dulu}"
: "${SERVICE_ROLE_KEY:?Set SERVICE_ROLE_KEY dulu}"

API="${SUPABASE_URL}/auth/v1/admin/users"
: "${SEED_INITIAL_PASSWORD:?Set SEED_INITIAL_PASSWORD dulu}"
export SEED_INITIAL_PASSWORD
umask 077
seed_response=$(mktemp)
trap 'rm -f -- "$seed_response"' EXIT

create_user() {
  local email="$1" nama="$2" jabatan="$3" bidang="$4" kelompok="$5" level="$6"

  echo "Creating: ${email} (${nama})"
  python3 - "$email" "$nama" <<'PYJSON' | curl --fail --silent --show-error --output "$seed_response" \
    -X POST "$API" \
    -H "apikey: ${SERVICE_ROLE_KEY}" \
    -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
    -H "Content-Type: application/json" --data-binary @-
import json, os, sys
print(json.dumps({"email": sys.argv[1], "password": os.environ["SEED_INITIAL_PASSWORD"], "email_confirm": True, "user_metadata": {"nama_lengkap": sys.argv[2]}}))
PYJSON
  local user_id
  user_id=$(python3 -c 'import json,sys,uuid; print(uuid.UUID(json.load(sys.stdin)["id"]))' < "$seed_response")
  python3 - "$nama" "$jabatan" "$bidang" "$kelompok" "$level" <<'PYJSON' | curl --fail --silent --show-error --output "$seed_response" \
    -X PATCH "${SUPABASE_URL}/rest/v1/profiles?id=eq.${user_id}" \
    -H "apikey: ${SERVICE_ROLE_KEY}" \
    -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
    -H "Content-Type: application/json" -H "Prefer: return=representation" --data-binary @-
import json, sys
print(json.dumps(dict(zip(["nama_lengkap", "jabatan", "bidang_divisi", "kelompok", "level"], sys.argv[1:]))))
PYJSON
  python3 -c 'import json,sys; rows=json.load(sys.stdin); sys.exit(0 if isinstance(rows,list) and len(rows)==1 else 1)' < "$seed_response"

}

echo "=== Seed 26 akun pengurus Forum GenRe Kota Depok ==="
echo ""

# Pengurus Inti
create_user "ketua@genredepok.or.id"          "Muhammad Ighasta Mughis"       "Ketua Umum"                      "Pengurus Inti"    "Pengurus Inti"    "inti"
create_user "wakil@genredepok.or.id"           "Muhamad Arfan"                "Wakil Ketua Umum"                "Pengurus Inti"    "Pengurus Inti"    "inti"
create_user "sekretaris@genredepok.or.id"      "Raihan Satria Elezar"         "Sekretaris Umum"                 "Pengurus Inti"    "Pengurus Inti"    "inti"
create_user "bendahara1@genredepok.or.id"      "Nazwa Zahira"                 "Bendahara Controller"            "Pengurus Inti"    "Pengurus Inti"    "inti"
create_user "bendahara2@genredepok.or.id"      "Tiara Maulidia"               "Bendahara Treasure & BUMF"       "Pengurus Inti"    "Pengurus Inti"    "inti"

# Kepala Bidang
create_user "kabid.internal@genredepok.or.id"  "Roidah A'isyi Shofwah"        "Kepala Bidang Internal"          "Kepala Bidang"    "Kepala Bidang"    "kabid"
create_user "kabid.eksternal@genredepok.or.id" "Agnia Khumaira"               "Kepala Bidang Eksternal"         "Kepala Bidang"    "Kepala Bidang"    "kabid"
create_user "kabid.branding@genredepok.or.id"  "Teuku Andika Jalaluddin Rumi" "Kepala Bidang Branding"          "Kepala Bidang"    "Kepala Bidang"    "kabid"

# Kadiv - Bidang Eksternal
create_user "fauzan.reguler@genredepok.or.id"  "Muhammad Fauzan Al-Anshori"   "Kadiv Program Reguler"           "Bidang Eksternal" "Bidang Eksternal" "kadiv"
create_user "fathir.nonreg@genredepok.or.id"   "Fathir Muhammad Ramadhan"     "Kadiv Program Non-Reguler"       "Bidang Eksternal" "Bidang Eksternal" "kadiv"

# Kadiv - Bidang Internal
create_user "rizkan.kecamatan@genredepok.or.id" "Muhamad Rizkan H."           "Kadiv Forum GenRe Kecamatan"     "Bidang Internal"  "Bidang Internal"  "kadiv"
create_user "melani.duta@genredepok.or.id"      "Melani Sofyan Putri"          "Kadiv Duta GenRe"                "Bidang Internal"  "Bidang Internal"  "kadiv"
create_user "ade.pikr@genredepok.or.id"         "Ade Rifki Perdian"            "Kadiv PIK-R"                     "Bidang Internal"  "Bidang Internal"  "kadiv"

# Kadiv - Bidang Branding
create_user "diva.pr@genredepok.or.id"          "Muhammad Diva"                "Kadiv Public Relation"           "Bidang Branding"  "Bidang Branding"  "kadiv"
create_user "allya.sosmed@genredepok.or.id"     "Allya Nurul Febyana"          "Kadiv Social Media"              "Bidang Branding"  "Bidang Branding"  "kadiv"
create_user "annisa.design@genredepok.or.id"    "Annisa Revy Alifiah"          "Kadiv Design"                    "Bidang Branding"  "Bidang Branding"  "kadiv"
create_user "kadiv.video@genredepok.or.id"      "Plt. Kepala Divisi"           "Kadiv Video Editor"              "Bidang Branding"  "Bidang Branding"  "kadiv"

# Staff
create_user "adrian.video@genredepok.or.id"     "Adrian Saputra Kaban"         "Staff Divisi Video Editor"       "Bidang Branding"  "Bidang Branding"  "staff"
create_user "radit@genredepok.or.id"            "Radit"                        "Staff Divisi Program Reguler"    "Bidang Eksternal" "Bidang Eksternal" "staff"
create_user "darlo@genredepok.or.id"            "Darlo"                        "Staff Divisi Program Non-Reguler" "Bidang Eksternal" "Bidang Eksternal" "staff"
create_user "frida@genredepok.or.id"            "Frida Fatma Salsabila"        "Staff Divisi Forum GenRe Kec"    "Bidang Internal"  "Bidang Internal"  "staff"
create_user "alya.duta@genredepok.or.id"        "Alya Citra Lestari"           "Staff Divisi Duta GenRe"         "Bidang Internal"  "Bidang Internal"  "staff"
create_user "natasya@genredepok.or.id"          "Natasya Wulandari Priyanto"   "Staff Divisi PIK-R"              "Bidang Internal"  "Bidang Internal"  "staff"
create_user "raihan.pr@genredepok.or.id"        "Raihan Sukmajaya"             "Staff Divisi Public Relation"    "Bidang Branding"  "Bidang Branding"  "staff"
create_user "faza@genredepok.or.id"             "Muhammad Faza"                "Staff Divisi Social Media"       "Bidang Branding"  "Bidang Branding"  "staff"
create_user "faizah@genredepok.or.id"           "Siti Nur Faizah"              "Staff Divisi Design"             "Bidang Branding"  "Bidang Branding"  "staff"

echo ""
echo "=== Selesai! 26 akun telah dibuat ==="
echo "Gunakan password sementara dari SEED_INITIAL_PASSWORD; minta pengurus menggantinya setelah aktivasi."
echo "Login di: ${SUPABASE_URL}"
