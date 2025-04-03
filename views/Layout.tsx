import type {FC, ReactNode} from 'hono/jsx';

export interface ILayoutProps {
  children: ReactNode;
}

export const Layout: FC = ({children}: ILayoutProps) => (
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta name="color-scheme" content="light dark" />
      <link rel="icon" type="image/x-icon" href="/favicon.ico"></link>
      <script src="https://cdn.jsdelivr.net/npm/htmx@0.0.2/htmx.min.js"></script>
      <script src="https://cdn.jsdelivr.net/npm/htmx-toaster@0.0.20/dist/htmx-toaster.min.js"></script>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@picocss/pico@2.1.1/css/pico.min.css" />
      <title>E+TV</title>
    </head>
    <body>{children}</body>
  </html>
);
