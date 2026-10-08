# Как запустить EquiRoute

## 1. Установка

В PowerShell из папки проекта:

```powershell
npm install
Copy-Item .env.example .env
npm run dev
```

Открыть:

```text
http://localhost:3000
```

Без ключей приложение работает в **Demo mode**.

## 2. Реальные Binance Web3 API

Открой `.env` и укажи НОВЫЙ API key/Secret Key из Developer Portal:

```env
DEMO_MODE=false
BINANCE_WEB3_API_KEY=...
BINANCE_WEB3_SECRET_KEY=...
```

Secret Key нельзя коммитить и нельзя вставлять в README/GitHub.

После сохранения перезапусти `npm run dev`.

## 3. Что вводить на сайте

- `Stock ticker`: например `NVDA`.
- `Spend`: сколько USDT хотим потратить.
- `Maximum execution premium`: максимально допустимое ухудшение реального исполнения относительно Binance RWA reference.
- `BSC wallet address`: обычный публичный `0x...` адрес. Приватный ключ не нужен.

## 4. Что делает кнопка

Приложение получает реальные RWA-представления на BSC, запрашивает исполнимый RFQ quote, пересчитывает получаемые токены в эквивалент базовой акции и показывает ALLOW / CAUTION / BLOCK.

Для live RFQ оно также строит `approve` и прогоняет его через Transaction API simulation. Ничего не подписывается и не отправляется в сеть.
