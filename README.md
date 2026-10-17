# MOD / MACHINE

Небольшой интерактивный MOD-плеер в оболочке, вдохновлённой Amiga Workbench. Показывает текущий паттерн, строку, каналы и уровни сигнала; каждый канал можно действительно отключить во время воспроизведения.

Автор проекта и интерфейса — **bitwow**.

## Стек

- React + Vite;
- `libopenmpt`/WebAssembly через код [Chipsound](https://github.com/gamosoft/chipsound) и `chiptune3`;
- полностью клиентское воспроизведение через AudioWorklet;
- GitHub Pages — сервер и база данных не нужны.

Размер окна плеера переключается между `COMPACT`, `NORMAL` и `WIDE`; выбор сохраняется в браузере. Иконки `README`, `ABOUT` и `RAM DISK` на рабочем столе открывают небольшие системные окна. На мобильных устройствах плеер разворачивается на весь viewport и использует вкладки `TRACKER`, `SCOPE`, `MIXER` и `PLAYLIST`, не прокручивая страницу браузера.

Лицензии использованных компонентов лежат в `public/engine/`.

## Локальный запуск

```bash
npm install
npm run dev
```

AudioWorklet работает на `localhost` или HTTPS. Открытие `index.html` напрямую через `file://` не поддерживается.

## GitHub Pages

1. Создайте репозиторий и отправьте проект в ветку `main`.
2. В GitHub откройте **Settings → Pages → Source → GitHub Actions**.
3. Workflow из `.github/workflows/deploy.yml` соберёт и опубликует `dist/`.

`base: './'` в Vite позволяет размещать приложение и на `username.github.io/repository/`, и на собственном домене.

## Музыка и права

Демо-каталог загружает девять композиций Jogeir Liljedahl напрямую с The Mod Archive:

- [Variations](https://modarchive.org/index.php?query=65280&request=view_by_moduleid);
- [00noname](https://modarchive.org/index.php?query=51604&request=view_by_moduleid);
- [Overture](https://modarchive.org/index.php?query=61595&request=view_by_moduleid);
- [Last Farewell](https://modarchive.org/index.php?query=47493&request=view_by_moduleid);
- [GComp](https://modarchive.org/index.php?query=167093&request=view_by_moduleid);
- [Keys to Imagination](https://modarchive.org/index.php?query=47651&request=view_by_moduleid);
- [Smile](https://modarchive.org/index.php?query=57542&request=view_by_moduleid);
- [Infinity](https://modarchive.org/index.php?query=165651&request=view_by_moduleid);
- [Face Another Day](https://modarchive.org/index.php?query=41006&request=view_by_moduleid).

На страницах модулей указана The Mod Archive Distribution License. Файлы не входят в сборку сайта и загружаются по HTTPS с сервера архива. Пользовательские файлы, открытые через **OPEN .MOD**, обрабатываются локально и никуда не загружаются.

Короткий текст для публикации находится в [POST.md](./POST.md), исходный концепт — в [docs/concepts/mod-machine-concept.png](./docs/concepts/mod-machine-concept.png), а концепт рабочего стола — в [docs/concepts/mod-machine-workbench-concept.png](./docs/concepts/mod-machine-workbench-concept.png).
