## Деплой на beget.com

1. **Подготовка структуры**
   - В корне проекта должны быть директории `styles/`, `scripts/`, `data/`, `docs/`, `n8n/workflows/` и файл `index-fixed.html`.
   - Убедитесь, что в `styles/` лежит `lk.css`, в `scripts/` — `main.js` и `lk.js`, в `data/` — `app-config.json`, а в `docs/` — `offer.html`.

2. **Загрузка на хостинг**
   - В панели beget создайте сайт и включите HTTPS.
   - Содержимое директории проекта загрузите в `public_html/`, сохранив структуру папок.

3. **Яндекс.Метрика**
   - Проверьте, что в `index-fixed.html` используется счётчик с ID `104859506` и он подключён один раз.
   - Все кнопки и ссылки, ведущие в Telegram-бота, помечены атрибутом `data-ym-target`.

4. **Telegram Login Widget**
   - В BotFather для `@TEXTStyle_pro_bot` добавьте домен сайта в список разрешённых.
   - После деплоя проверьте, что виджет авторизации отображается в секции «Личный кабинет».

5. **n8n**
   - Разверните n8n (например, на VPS) и импортируйте `n8n/workflows/textstyle.json`.
   - В настройках окружения задайте переменные: `TELEGRAM_BOT_TOKEN`, `JWT_SECRET`, `AIRTABLE_CRED_ID` и API-ключи.
   - Активируйте вебхуки и убедитесь, что базовый URL совпадает с `n8n_base_url` из `data/app-config.json`.

6. **Airtable**
   - Используйте базу `appr8PCGGMxbHoY7Y` с таблицами `Leads`, `Reviews`, `Payments`, `Referrals`.
   - В таблице `Reviews` предусмотрены поля: `user_id`, `user_name`, `user_photo`, `rating`, `review_text`, `is_public`, `is_prof`, `created_at`.

7. **Toolsy вебхуки**
   - Настройте в Toolsy отправку событий на адреса `.../toolsy/payment.success`, `payment.failed`, `subscription.*`, `refund.created`.
   - Проверяйте, что записи появляются в таблице `Payments` Airtable.

8. **Проверки после деплоя**
   - Авторизация через Telegram в личном кабинете, отправка отзыва (появляется запись в Airtable).
   - Статус рефералки и история оплат загружаются без ошибок.
   - Клики по CTA фиксируются в Метрике (цель `open_bot`).
   - Страница `/docs/offer.html` доступна по ссылке в подвале.

9. **Кэширование**
   - Для `data/app-config.json` настройте короткий TTL или отключите агрессивный кэш.

10. **Логи и мониторинг**
    - Отслеживайте ошибки n8n и запросов фронтенда через логи сервера или Sentry.
