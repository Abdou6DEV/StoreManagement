# StoreManagement

A modern desktop application for managing store operations, built with Electron, React, TypeScript, and Tailwind CSS.

## Features

- Dashboard for business insights
- Cashier and transaction processing
- Inventory and stock management
- Client management (debts, payments, orders)
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

### Database Setup

After installation, you need to set up the database:

```bash
# Generate Prisma client
npx prisma generate

# Push the database schema to create tables
npx prisma db push

# Seed the database with test data (development only)
npx prisma db seed
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
  pages/         # Main app pages (Dashboard, Clients, MainMenu, etc.)
  lib/           # Shared components, contexts, hooks, utils
  index.css      # Tailwind and global styles
public/          # Static assets
```

**Note:** All files/folders in the `/src` directory must follow camelCase naming convention.
