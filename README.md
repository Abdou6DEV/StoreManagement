# StoreManagement

A modern desktop application for managing store operations, built with Electron, React, TypeScript, and Tailwind CSS.

## Features

- Dashboard for business insights
- Cashier and transaction processing
- Inventory and stock management
- Client management (debts, payments, orders)
- Zakat Al Mal calculator
- Admin/settings panel
- Responsive UI with dark mode support

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v16 or higher recommended)
- [npm](https://www.npmjs.com/) (comes with Node.js)

### Installation

```bash
npm install
```

### Development

To start the app in development mode:

```bash
npm run start
```

### Linting & Formatting

- Lint code:
  ```bash
  npm run lint
  ```
- Format code:
  ```bash
  npm run format
  ```

### Building for Production

To build the Electron app:

```bash
npm run make
```

## Project Structure

```
src/
  pages/         # Main app pages (Dashboard, Customers, MainMenu, etc.)
  lib/           # Shared components, contexts, hooks, utils
  index.css      # Tailwind and global styles
public/          # Static assets
```

## License

MIT
