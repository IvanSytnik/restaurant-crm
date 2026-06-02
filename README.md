# Restaurant CRM — Полный проект

Полная версия со всеми обновлениями: i18n (DE/EN/UK), план зала, walk-in, управление столами.

## Восстановление после удаления

Твои данные в БД на Neon **целы** — никакая локальная команда их не трогает. Восстанавливаем только локальный код.

### Шаг 1. Распакуй проект

Распакуй этот архив куда-нибудь (например, в `~/Documents/restaurant-crm`). **НЕ в Downloads** — там может быть старый сломанный `package-lock.json`.

### Шаг 2. Открой в VS Code

```bash
cd ~/Documents/restaurant-crm
code .
```

### Шаг 3. Создай .env

```bash
cp .env.example .env
```

Открой `.env` и вставь свои значения:

```env
DATABASE_URL="..."           # твоя строка из Neon (та же что раньше)
NEXTAUTH_SECRET="..."        # любая длинная случайная строка
NEXTAUTH_URL="http://localhost:3000"
OWNER_EMAIL="owner@restaurant.at"
OWNER_PASSWORD="changeme123"
```

Если не помнишь Neon connection string — зайди на https://neon.tech, открой свой проект, скопируй из Dashboard.

Сгенерируй новый `NEXTAUTH_SECRET`:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Шаг 4. Установи зависимости

```bash
npm install
```

### Шаг 5. Синхронизируй Prisma с БД

```bash
npx prisma db push
```

Эта команда подключится к твоей БД и убедится что структура совпадает. **Данные не удалятся.**

### Шаг 6. Запуск

```bash
npm run dev
```

Открой http://localhost:3000/admin/login → логин с твоими данными:
- `owner@restaurant.at` / `changeme123`

---

## Что должно работать сразу

- Логин на украинском языке
- Сайдбар с переключателем 🇺🇦 / 🇩🇪 / 🇬🇧 внизу
- Все твои брони, столы и настройки (они в БД на Neon)
- План зала со статусами
- Walk-in посадка через клик по столу
- Управление столами с защитой от удаления при наличии броней

---

## Если что-то не работает

**Ошибка lockfile в Downloads:**
```bash
ls ~/Downloads/restaurant-crm
rm -rf ~/Downloads/restaurant-crm   # если это старая копия
```

**Чистый перезапуск:**
```bash
rm -rf .next node_modules package-lock.json
npm install
npm run dev
```

**Если Owner-аккаунт пропал в БД:**
```bash
npm run seed
```

---

## Команды

```bash
npm run dev          # dev-сервер
npm run build        # production-сборка
npm run db:studio    # просмотр БД в браузере
npm run db:push      # синхронизация schema с БД
npm run seed         # пересоздать начальные данные
```
