# Welcome to your Lovable project

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Open your project in the [Lovable editor](https://lovable.dev) and keep building.

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: connect the project to GitHub and every change made in Lovable is committed straight to your repository.
- **Full ownership**: this code is yours. Push to your repository and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

`npm run dev` automatically creates `.env` from the committed `.env.example`
if `.env` is missing. The example contains only the public connection settings,
not secret keys. Existing `.env` files are never overwritten. Keep `.env` ignored
by Git; keep `.env.example` and `scripts/` in the repository.

After pulling this update, stop any running dev server with Ctrl+C, then run
`npm run dev` again and open the localhost address printed in the terminal.
If you already have an incomplete `.env`, back it up and copy `.env.example`
to `.env` manually (`copy .env.example .env` on Windows, `cp .env.example .env`
on macOS/Linux). Restart the dev server after changing environment settings.

This setup fixes missing connection settings; it does not enable Google or
Lovable OAuth on localhost or provision privileged server credentials required
by multiplayer operations. Never put private credentials in `VITE_*` variables.

## Built with

- TanStack Start
- TypeScript
- React
- Tailwind CSS
