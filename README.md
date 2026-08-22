# pressMe — storm → bloom

```bash
cd pressme
python3 -m http.server 8000
# відкрий http://localhost:8000
```

or

```bash
npx serve .
```

---

### Дрібниця, яку варто зробити після деплою

У `index.html` рядок з `og:image` зроби абсолютним — тоді у прев'ю посилання
(Telegram, iMessage, тощо) буде красива картинка замість порожнечі:

```html
<meta property="og:image" content="https://ТВІЙ_НІК.github.io/pressme/og.png" />
```

