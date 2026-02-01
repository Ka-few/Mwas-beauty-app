# Mwas Beauty Salon Management System

![Mwas Beauty Logo](frontend/src/assets/logo.png)

## Overview
**Mwas Beauty** is a comprehensive desktop management application tailored for beauty salons. It streamlines daily operations by managing clients, staff, sales, and financial reporting in a unified, user-friendly interface. Built with modern web technologies and wrapped in Electron, it offers a robust solution for salon owners to track performance and manage their business efficiently.

## Key Features

### 💰 Sales Management
- **Point of Sale (POS):** Fast and intuitive interface for recording service and product sales.
- **Client Tracking:** Assign sales to specific clients or walk-ins.
- **Commission Tracking:** Automatically calculate commissions for stylists based on services performed.
- **Receipts:** Generate and print professional receipts with company branding.

### 👥 Staff & Client Management
- **Stylist Management:** Manage staff profiles and commission rates.
- **Client Database:** Maintain a record of client history and preferences.
- **Admin & Staff Roles:** Secure access with Role-Based Access Control (RBAC) for Admins and Staff.

### 📊 Financial Reporting
- **Dashboard:** Real-time visibility into daily revenue, top stylists, and other key metrics.
- **Daily Reports:** Detailed breakdown of gross revenue, product profits, and net income.
- **PDF Exports:**
    - **Financial Reports:** Branded PDF summaries for record-keeping.
    - **Commission Payouts:** Daily sign-off sheets for staff commission payments.
- **Expense Tracking:** Monitor salon expenses to calculate true net profit.

### 🛠 Administrative Tools
- **Inventory Management:** Track product stock and pricing.
- **Service Menu:** Configure service offerings and pricing.
- **User Management:** Create and manage system users.

## Tech Stack
- **Frontend:** React, TypeScript, Tailwind CSS, Vite
- **Backend:** Node.js, Express, SQLite
- **Desktop Wrapper:** Electron
- **Reporting:** jsPDF, jspdf-autotable

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm (v9 or higher)

### Installation
1.  **Clone the repository**
    ```bash
    git clone git@github.com:Ka-few/Mwas-beauty-app.git
    cd Mwas-beauty-app
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

3.  **Run Development Mode** (Runs Backend + Frontend + Electron)
    ```bash
    npm run dev
    ```

### Web Mode (Browser Only)
To run the application in a web browser for testing without Electron:
```bash
npm run web
```
Access the app at `http://localhost:3000`.

## Building for Production
To package the application as a standalone executable (Windows .exe or Linux .AppImage):

```bash
npm run dist
```
The installers will be generated in the `dist/` directory.

### 🪟 Building for Windows
> [!IMPORTANT]
> Because of native modules (like `sqlite3`), the Windows installer must be built on a Windows machine or via CI/CD.

- **Option 1 (CI/CD):** Push your changes to the `main` branch. GitHub Actions will automatically build the Windows installer and make it available in the **Actions** tab of your repository.
- **Option 2 (Local Windows Build):** If you are on a Windows machine, run `npm run dist`.

## License
Confidential & Proprietary - Mwas Beauty Systems.

## Developer
**Developed by [Njoroge](https://github.com/Ka-few)**
