#!/bin/bash
BASE="http://localhost:4000/api"
TOKEN="jaishreeram"
PASS=0; FAIL=0
GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; NC='\033[0m'

check() {
  local label="$1" method="$2" url="$3" data="$4"
  if [ -n "$data" ]; then
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" "$url" \
      -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
      -d "$data" --max-time 6)
  else
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" "$url" \
      -H "Authorization: Bearer $TOKEN" --max-time 6)
  fi
  if [[ "$STATUS" == "5"* || "$STATUS" == "000" ]]; then
    echo -e "  ${RED}✘${NC} [$STATUS] $label"; FAIL=$((FAIL+1))
  else
    echo -e "  ${GREEN}✔${NC} [$STATUS] $label"; PASS=$((PASS+1))
  fi
}

FP='{"tripName":"T","participants":[{"id":"u1","name":"A"},{"id":"u2","name":"B"}],"bookings":[{"id":"b1","title":"H","amount":10000,"payer":"u1","participants":["u1","u2"]}]}'

echo -e "\n============================================================"
echo -e "  HackCelestial API Health Check — $(date '+%H:%M:%S')"
echo -e "============================================================"

echo -e "\n🟢 HEALTH"
check "GET /health"                                 GET  "$BASE/health"

echo -e "\n👤 AUTH / USERS"
check "POST /users/login (bad creds→4xx)"           POST "$BASE/users/login"              '{"email":"x","password":"x"}'
check "POST /users/registerUser (bad→4xx)"          POST "$BASE/users/registerUser"       '{"email":"bad"}'
check "POST /users/check-registered"                POST "$BASE/users/check-registered"   '{"email":"t@t.com"}'
check "POST /users/sendOtp"                         POST "$BASE/users/sendOtp"            '{"phone":"9999999999"}'
check "GET  /users/checkAuth"                       GET  "$BASE/users/checkAuth"
check "GET  /users/profile"                         GET  "$BASE/users/profile"
check "GET  /users/me/payments"                     GET  "$BASE/users/me/payments"
check "POST /users/forgot-password"                 POST "$BASE/users/forgot-password"    '{"email":"x@x.com"}'
check "POST /users/refresh"                         POST "$BASE/users/refresh"            '{}'

echo -e "\n👥 GROUPS"
check "GET  /groups/my-groups"                      GET  "$BASE/groups/my-groups"
check "POST /groups (empty→4xx)"                    POST "$BASE/groups"                   '{}'
check "GET  /groups/nonexistent"                    GET  "$BASE/groups/nonexistent"

echo -e "\n✉️  INVITES"
check "GET  /invites/my-pending"                    GET  "$BASE/invites/my-pending"
check "GET  /invites/badcode"                       GET  "$BASE/invites/badcode"

echo -e "\n💳 PAYMENTS"
check "GET  /payments/my-payments"                  GET  "$BASE/payments/my-payments"
check "POST /payments/record (empty→4xx)"           POST "$BASE/payments/record"          '{}'
check "POST /payments/razorpay/create-order"        POST "$BASE/payments/razorpay/create-order" '{}'

echo -e "\n🔔 NOTIFICATIONS"
check "GET  /notifications"                         GET  "$BASE/notifications"

echo -e "\n📦 PACKAGES"
check "GET  /packages/explore"                      GET  "$BASE/packages/explore"
check "GET  /packages"                              GET  "$BASE/packages"

echo -e "\n🔖 SAVED TRIPS"
check "GET  /saved-trips"                           GET  "$BASE/saved-trips"

echo -e "\n🎧 SUPPORT"
check "GET  /support/tickets"                       GET  "$BASE/support/tickets"
check "POST /support/assistant"                     POST "$BASE/support/assistant"        '{"message":"hello"}'

echo -e "\n🍽️  DINE"
check "GET  /dine/restaurants/nearby"               GET  "$BASE/dine/restaurants/nearby"
check "GET  /dine/restaurants/search?q=pizza"       GET  "$BASE/dine/restaurants/search?q=pizza"
check "GET  /dine/restaurants/favorites"            GET  "$BASE/dine/restaurants/favorites"

echo -e "\n⚡ TRIP FAIRNESS AI"
check "POST /trip-fairness/analyze"                 POST "$BASE/trip-fairness/analyze"    "$FP"
check "POST /trip-fairness/nugen"                   POST "$BASE/trip-fairness/nugen"      "$FP"
check "POST /trip-fairness/simulate"                POST "$BASE/trip-fairness/simulate"   "$FP"
check "GET  /trip-fairness/metrics"                 GET  "$BASE/trip-fairness/metrics"

echo -e "\n📲 PUSH TOKENS"
check "POST /user-push-tokens (empty→4xx)"          POST "$BASE/user-push-tokens"         '{}'

echo -e "\n============================================================"
echo -e "  Total: $((PASS+FAIL))  ${GREEN}Pass: $PASS${NC}  ${RED}Fail: $FAIL${NC}"
echo -e "============================================================\n"
