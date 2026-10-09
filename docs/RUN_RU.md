# Как запустить EquiRoute

## 1. Установка

PowerShell в папке проекта:

```powershell
pnpm install
Copy-Item .env.example .env
pnpm dev
```

Открыть `http://localhost:3000`.

## 2. Live-режим

В `.env`:

```env
DEMO_MODE=false
BINANCE_WEB3_API_KEY=НОВЫЙ_API_KEY
BINANCE_WEB3_SECRET_KEY=НОВЫЙ_SECRET_KEY
```

Secret Key никому не отправлять и в GitHub не коммитить.

## 3. Как пользоваться

1. Ticker: например `NVDA`.
2. Spend: например `500` USDT.
3. Premium limit: например `1.0%`.
4. Ввести только публичный BSC-адрес `0x...` или нажать **Connect wallet** — программа запросит только публичный адрес, без подписи.
5. Оставить включённым **Liquidity stress probe**, если нужно дополнительно проверить тот же маршрут на размере в 5 раз больше.
6. Нажать **Run execution firewall**.

Смотреть прежде всего:

- `Displayed gap` — как цена токена выглядит относительно reference price с учётом `tokenToShareRatio`.
- `Executable premium` — фактическая переплата по live quote.
- `Hidden gap` — насколько реальное исполнение хуже/лучше того, что кажется по отображаемой цене.
- `Route advantage` — сколько reference-equivalent value сохраняет лучший маршрут относительно альтернативы.
- `Wallet preflight` — хватает ли USDT и есть ли BNB на gas.
- `Transaction dry-run` — прошёл ли dry-run approval.
- `API trace` — какие Binance API реально вызвались и сколько заняли.
- `5× size stress probe` — как меняется executable premium, если размер заявки увеличить в 5 раз; это помогает увидеть чувствительность к ликвидности.

`BLOCK` — не исполнять. `CAUTION` — цена проходит правило, но есть дополнительный фактор (например закрытый underlying market). `ALLOW` — live quote проходит правило и wallet readiness в порядке, но реальное исполнение всё равно требует отдельного подтверждения пользователя.

## 4. Agentic Wallet (не обязательно для обычного запуска)

Проверка нашего policy skill без сделки:

```powershell
node skills/equiroute-guard/scripts/cli.mjs analyze '{"symbol":"NVDA","amountUsd":100,"maxPremiumPercent":1,"walletAddress":"0x..."}'
```

Если официальный Binance Agentic Wallet CLI `baw` у тебя реально настроен, можно доказать read-only handoff:

```powershell
node skills/equiroute-guard/scripts/cli.mjs agentic-quote '{"symbol":"NVDA","amountUsd":100,"maxPremiumPercent":1,"walletAddress":"0x..."}'
```

Эта команда **не делает swap**: при `BLOCK` она вообще останавливается, иначе только получает второй quote через официальный Agentic Wallet CLI.
