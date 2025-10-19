#!/bin/bash

# Симуляція тестування MetaMask підключення через браузер

echo "🦊 Симуляція тестування MetaMask підключення..."
echo ""
echo "=== Кроки тестування ==="
echo ""

# Перевірка мережі
echo "1. Перевірка доступності Anvil мережі:"
CHAIN_ID=$(curl -s -X POST http://localhost:8545 -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' | jq -r '.result')

if [ "$CHAIN_ID" = "0x7a69" ]; then
    echo "   ✅ Anvil мережа працює (Chain ID: 31337)"
else
    echo "   ❌ Помилка: Anvil мережа недоступна"
    exit 1
fi

echo ""

# Перевірка аккаунта
echo "2. Перевірка тестового аккаунта:"
TEST_ACCOUNT="0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"

# Баланс ETH
ETH_BALANCE=$(cast balance $TEST_ACCOUNT --rpc-url http://localhost:8545)
ETH_FORMATTED=$(echo "scale=4; $ETH_BALANCE / 1000000000000000000" | bc -l)
echo "   ✅ ETH баланс: $ETH_FORMATTED ETH"

# Баланс USDC
USDC_CONTRACT="0x610178dA211FEF7D417bC0e6FeD39F05609AD788"
USDC_BALANCE=$(cast call $USDC_CONTRACT "balanceOf(address)(uint256)" $TEST_ACCOUNT --rpc-url http://localhost:8545)
USDC_FORMATTED=$(echo "scale=2; $USDC_BALANCE / 1000000" | bc -l)
echo "   ✅ USDC баланс: $USDC_FORMATTED USDC"

echo ""

# Перевірка контрактів
echo "3. Перевірка смарт-контрактів:"
OPTIONS_MARKET="0xc6e7DF5E7b4f2A278906862b61205850344D4e7d"

# Перевірка чи контракт існує
OPTIONS_CODE=$(cast code $OPTIONS_MARKET --rpc-url http://localhost:8545)
if [ ${#OPTIONS_CODE} -gt 2 ]; then
    echo "   ✅ OptionsMarket контракт розгорнуто"
else
    echo "   ❌ OptionsMarket контракт не знайдено"
fi

echo ""

# Перевірка серій опцій
echo "4. Перевірка доступних опцій через GraphQL:"
SERIES_COUNT=$(curl -s -X POST "http://localhost:4000/graphql" \
    -H "Content-Type: application/json" \
    -d '{"query": "query { series { id } }"}' | \
    jq '.data.series | length')

echo "   ✅ Знайдено $SERIES_COUNT серій опцій"

echo ""

# Симуляція MetaMask дій
echo "🚀 Симуляція дій користувача:"
echo ""
echo "   📱 Крок 1: Користувач відкриває MetaMask"
echo "   🔗 Крок 2: Підключається до мережі Anvil (localhost:8545)"
echo "   🔑 Крок 3: Імпортує тестовий аккаунт"
echo "   💻 Крок 4: Відкриває фронтенд (localhost:3001)"
echo "   🔌 Крок 5: Натискає 'Підключити MetaMask'"
echo "   ✅ Крок 6: Підтверджує підключення в MetaMask"

echo ""

# Симуляція approve операції
echo "💰 Симуляція approve USDC для покупки опцій:"

# Перевірка поточного allowance
ALLOWANCE=$(cast call $USDC_CONTRACT "allowance(address,address)(uint256)" $TEST_ACCOUNT $OPTIONS_MARKET --rpc-url http://localhost:8545)
ALLOWANCE_FORMATTED=$(echo "scale=2; $ALLOWANCE / 1000000" | bc -l)

echo "   📊 Поточний allowance: $ALLOWANCE_FORMATTED USDC"

if [ "$ALLOWANCE" -gt 0 ]; then
    echo "   ✅ USDC вже схвалено для трат"
else
    echo "   ⚠️  Потрібно схвалити USDC перед покупкою опцій"
fi

echo ""

# Симуляція отримання котирування
echo "📈 Симуляція отримання котирування опції:"
SERIES_ID="0x2311da76d249f1db64620f5e487e737215ebd53ef5c8a7759585dcb0232f014a"
AMOUNT="100000000000000000" # 0.1 опції

echo "   🎯 Серія опції: ETH CALL, Strike: 2000 USDC"
echo "   📊 Кількість: 0.1 опцій"
echo "   ⏱️  Експірація: ~2025-10-26"

echo ""
echo "🎉 ПІДГОТОВКА ДО ТЕСТУВАННЯ ЗАВЕРШЕНА!"
echo ""
echo "📋 Наступні кроки для ручного тестування:"
echo "   1. Відкрийте http://localhost:3001/test"
echo "   2. Перейдіть на вкладку '🤖 Автотест'"
echo "   3. Підключіть MetaMask (Chain ID: 31337)"
echo "   4. Натисніть 'Запустити автотест'"
echo "   5. Підтвердьте approve в MetaMask"
echo "   6. Натисніть 'Купити опцію'"
echo "   7. Підтвердьте покупку в MetaMask"
echo ""
echo "🔍 Для перегляду результатів:"
echo "   - Dashboard: http://localhost:3001 (вкладка Options)"
echo "   - Пули: http://localhost:3001/pools"
echo "   - Адмін: http://localhost:3001/admin"