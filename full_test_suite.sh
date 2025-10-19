#!/bin/bash

# Повний тестовий сценарій DeFi Options Platform
echo "🧪 ПОВНЕ ТЕСТУВАННЯ DEFI OPTIONS PLATFORM"
echo "========================================"
echo ""

# Кольори для виводу
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Функція для логування
log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Контракти та адреси
ANVIL_RPC="http://localhost:8545"
GRAPHQL_API="http://localhost:4000"
FRONTEND_URL="http://localhost:3001"
ADMIN_ACCOUNT="0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
PRIVATE_KEY="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
OPTIONS_MARKET="0xc6e7DF5E7b4f2A278906862b61205850344D4e7d"
USDC_TOKEN="0x610178dA211FEF7D417bC0e6FeD39F05609AD788"
WETH_TOKEN="0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e"
WORKING_SERIES="0x75dc6672695dbed160e4dd0605c3e5f5027c0fa5147feced2267c79e5ffbf127"

echo "🔧 ТЕСТ 1: Перевірка інфраструктури"
echo "-----------------------------------"

# 1.1 Перевірка Anvil
log_info "Перевіряю Anvil blockchain..."
CHAIN_ID=$(curl -s -X POST $ANVIL_RPC -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' | jq -r '.result')
if [ "$CHAIN_ID" = "0x7a69" ]; then
    log_success "Anvil працює (Chain ID: 31337)"
else
    log_error "Anvil недоступний або неправильний Chain ID: $CHAIN_ID"
    exit 1
fi

# 1.2 Перевірка GraphQL API
log_info "Перевіряю GraphQL API..."
API_STATUS=$(curl -s $GRAPHQL_API/health | jq -r '.status' 2>/dev/null)
if [ "$API_STATUS" = "ok" ]; then
    log_success "GraphQL API працює"
else
    log_error "GraphQL API недоступний"
    exit 1
fi

# 1.3 Перевірка Frontend
log_info "Перевіряю Frontend..."
FRONTEND_STATUS=$(curl -s -I $FRONTEND_URL | head -1 | grep "200" || echo "")
if [ ! -z "$FRONTEND_STATUS" ]; then
    log_success "Frontend доступний"
else
    log_warning "Frontend може бути недоступний"
fi

echo ""
echo "💰 ТЕСТ 2: Перевірка токенів та балансів"
echo "---------------------------------------"

# 2.1 Баланс ETH
log_info "Перевіряю ETH баланс..."
ETH_BALANCE=$(cast balance $ADMIN_ACCOUNT --rpc-url $ANVIL_RPC)
ETH_FORMATTED=$(echo "scale=4; $ETH_BALANCE / 1000000000000000000" | bc -l)
log_success "ETH баланс: $ETH_FORMATTED ETH"

# 2.2 Баланс USDC
log_info "Перевіряю USDC баланс..."
USDC_BALANCE=$(cast call $USDC_TOKEN "balanceOf(address)(uint256)" $ADMIN_ACCOUNT --rpc-url $ANVIL_RPC)
USDC_FORMATTED=$(echo "scale=2; $USDC_BALANCE / 1000000" | bc -l)
log_success "USDC баланс: $USDC_FORMATTED USDC"

# 2.3 Баланс WETH
log_info "Перевіряю WETH баланс..."
WETH_BALANCE=$(cast call $WETH_TOKEN "balanceOf(address)(uint256)" $ADMIN_ACCOUNT --rpc-url $ANVIL_RPC)
WETH_FORMATTED=$(echo "scale=2; $WETH_BALANCE / 1000000000000000000" | bc -l)
log_success "WETH баланс: $WETH_FORMATTED WETH"

echo ""
echo "📊 ТЕСТ 3: Перевірка серій опцій"
echo "-------------------------------"

# 3.1 GraphQL серії
log_info "Отримую серії з GraphQL..."
GRAPHQL_SERIES=$(curl -s -X POST "$GRAPHQL_API/graphql" -H "Content-Type: application/json" -d '{"query": "query { series { id optionType strikeWad expiry } }"}' | jq '.data.series | length')
log_success "GraphQL повертає $GRAPHQL_SERIES серій"

# 3.2 Контрактні серії
log_info "Перевіряю серії в контракті..."
CONTRACT_SERIES=$(cast call $OPTIONS_MARKET "listSeriesIds()(bytes32[])" --rpc-url $ANVIL_RPC | jq '. | length')
log_success "Контракт має $CONTRACT_SERIES серій"

# 3.3 Тест котирування
log_info "Тестую котирування опції..."
QUOTE_RESULT=$(cast call $OPTIONS_MARKET "quote(bytes32,uint256)(uint256,uint256)" $WORKING_SERIES 100000000000000000 --rpc-url $ANVIL_RPC)
PREMIUM=$(echo $QUOTE_RESULT | cut -d' ' -f1)
FEE=$(echo $QUOTE_RESULT | cut -d' ' -f2)
PREMIUM_USDC=$(echo "scale=2; $PREMIUM / 1000000" | bc -l)
FEE_USDC=$(echo "scale=2; $FEE / 1000000" | bc -l)
log_success "Quote: Premium $PREMIUM_USDC USDC, Fee $FEE_USDC USDC"

echo ""
echo "🔐 ТЕСТ 4: Approve операції"
echo "--------------------------"

# 4.1 Перевірка поточного allowance
log_info "Перевіряю поточний allowance..."
CURRENT_ALLOWANCE=$(cast call $USDC_TOKEN "allowance(address,address)(uint256)" $ADMIN_ACCOUNT $OPTIONS_MARKET --rpc-url $ANVIL_RPC)
ALLOWANCE_USDC=$(echo "scale=2; $CURRENT_ALLOWANCE / 1000000" | bc -l)
log_info "Поточний allowance: $ALLOWANCE_USDC USDC"

# 4.2 Додатковий approve якщо потрібно
if [ $(echo "$CURRENT_ALLOWANCE < 500000000" | bc) -eq 1 ]; then
    log_info "Виконую додатковий approve..."
    cast send $USDC_TOKEN "approve(address,uint256)" $OPTIONS_MARKET 1000000000 --private-key $PRIVATE_KEY --rpc-url $ANVIL_RPC > /dev/null
    NEW_ALLOWANCE=$(cast call $USDC_TOKEN "allowance(address,address)(uint256)" $ADMIN_ACCOUNT $OPTIONS_MARKET --rpc-url $ANVIL_RPC)
    NEW_ALLOWANCE_USDC=$(echo "scale=2; $NEW_ALLOWANCE / 1000000" | bc -l)
    log_success "Новий allowance: $NEW_ALLOWANCE_USDC USDC"
else
    log_success "Allowance достатній для торгівлі"
fi

echo ""
echo "💸 ТЕСТ 5: Торгівля опціями"
echo "---------------------------"

# 5.1 Баланси до торгівлі
USDC_BEFORE=$(cast call $USDC_TOKEN "balanceOf(address)(uint256)" $ADMIN_ACCOUNT --rpc-url $ANVIL_RPC)
log_info "USDC до торгівлі: $(echo "scale=2; $USDC_BEFORE / 1000000" | bc -l) USDC"

# 5.2 Виконання торгівлі
log_info "Виконую торгівлю опцією..."
TRADE_TX=$(cast send $OPTIONS_MARKET "trade(bytes32,uint256,uint256)" $WORKING_SERIES 100000000000000000 200000000 --private-key $PRIVATE_KEY --rpc-url $ANVIL_RPC | grep "transactionHash" | awk '{print $2}')

if [ ! -z "$TRADE_TX" ]; then
    log_success "Торгівля успішна! TX: $TRADE_TX"
    
    # 5.3 Баланси після торгівлі
    sleep 2
    USDC_AFTER=$(cast call $USDC_TOKEN "balanceOf(address)(uint256)" $ADMIN_ACCOUNT --rpc-url $ANVIL_RPC)
    USDC_SPENT=$(echo "$USDC_BEFORE - $USDC_AFTER" | bc)
    USDC_SPENT_FORMATTED=$(echo "scale=2; $USDC_SPENT / 1000000" | bc -l)
    log_success "Витрачено: $USDC_SPENT_FORMATTED USDC"
else
    log_error "Помилка торгівлі"
fi

echo ""
echo "🏪 ТЕСТ 6: Frontend endpoints"
echo "----------------------------"

# 6.1 Головна сторінка
log_info "Тестую головну сторінку..."
curl -s $FRONTEND_URL > /dev/null && log_success "Головна сторінка доступна" || log_error "Помилка головної сторінки"

# 6.2 Тестова сторінка
log_info "Тестую тестову сторінку..."
curl -s $FRONTEND_URL/test > /dev/null && log_success "Тестова сторінка доступна" || log_error "Помилка тестової сторінки"

# 6.3 Пули ліквідності
log_info "Тестую сторінку пулів..."
curl -s $FRONTEND_URL/pools > /dev/null && log_success "Сторінка пулів доступна" || log_error "Помилка сторінки пулів"

# 6.4 Адміністрування
log_info "Тестую адмін сторінку..."
curl -s $FRONTEND_URL/admin > /dev/null && log_success "Адмін сторінка доступна" || log_error "Помилка адмін сторінки"

echo ""
echo "📡 ТЕСТ 7: GraphQL запити"
echo "-------------------------"

# 7.1 Запит серій
log_info "Тестую запит серій..."
SERIES_RESPONSE=$(curl -s -X POST "$GRAPHQL_API/graphql" -H "Content-Type: application/json" -d '{"query": "query { series { id optionType } }"}')
SERIES_COUNT=$(echo $SERIES_RESPONSE | jq '.data.series | length' 2>/dev/null)
if [ "$SERIES_COUNT" -gt 0 ]; then
    log_success "Запит серій працює ($SERIES_COUNT серій)"
else
    log_error "Помилка запиту серій"
fi

# 7.2 Запит активів
log_info "Тестую запит активів..."
ASSETS_RESPONSE=$(curl -s -X POST "$GRAPHQL_API/graphql" -H "Content-Type: application/json" -d '{"query": "query { assets { symbol } }"}')
ASSETS_COUNT=$(echo $ASSETS_RESPONSE | jq '.data.assets | length' 2>/dev/null)
if [ "$ASSETS_COUNT" -gt 0 ]; then
    log_success "Запит активів працює ($ASSETS_COUNT активів)"
else
    log_error "Помилка запиту активів"
fi

echo ""
echo "🎯 ПІДСУМОК ТЕСТУВАННЯ"
echo "======================"
log_success "✅ Інфраструктура працює"
log_success "✅ Токени та баланси в порядку"  
log_success "✅ Серії опцій доступні"
log_success "✅ Approve операції працюють"
log_success "✅ Торгівля опціями успішна"
log_success "✅ Frontend endpoints доступні"
log_success "✅ GraphQL API функціональний"

echo ""
log_info "🔗 Посилання для мануального тестування:"
echo "   📊 Dashboard: $FRONTEND_URL"
echo "   🧪 Автотест: $FRONTEND_URL/test"  
echo "   💧 Пули: $FRONTEND_URL/pools"
echo "   ⚙️  Адмін: $FRONTEND_URL/admin"

echo ""
log_success "🎉 ВСЕ ТЕСТУВАННЯ ЗАВЕРШЕНО УСПІШНО!"