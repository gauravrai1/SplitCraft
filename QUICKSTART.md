# 🚀 Quick Start Guide

## 30-Second Setup

### 0️⃣ Configure (First Time Only)

Edit `config/default.json` to set your people list, date filters, and the name of your CSV file.
Place your CSV in the `input/` folder.

### 1️⃣ Start the Server

```bash
npm start
# or: node server.js
```

You should see:
```
✅ Transaction Audit & Split App
📂 Folder Structure:
   ├── config/default.json      (Settings & people list)
   ├── input/                   (Sample CSV data)
   ├── output/                  (Exports & state)
   └── server.html   (Main app)

🚀 Open your browser: http://localhost:3000
```

### 2️⃣ Open the App

Visit: **http://localhost:3000**

### 3️⃣ Load Sample Data

On the config screen, click **"Load Sample Data"**

This loads the sample CSV from `input/` folder automatically.

### 4️⃣ Start Auditing

Click **"Start Audit Session"**

## ⌨️ Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Keep Transaction | `→` (Right Arrow) |
| Discard Transaction | `←` (Left Arrow) |
| Undo Last Action | `U` |
| Toggle Split Mode | `S` |
| Toggle Dark Mode | Click 🌙/☀️ button |

## 💡 How It Works

1. **Load CSV** - Upload your transactions
2. **Audit** - Review each transaction, keep or discard
3. **Split** - Optionally split expenses across people
4. **Export** - Download results as CSV

## 📁 Folders

```
├── config/          ← Edit default.json to customize people list
├── input/           ← Add your CSV files here
├── output/          ← Auto-saves state + exports
└── server.html
```

## 🔧 Customize

**Edit `config/default.json` to:**
- Set your people list
- Adjust default split type and percentages
- Set date filters

**Example:**
```json
{
  "people": ["Alice", "Bob", "Charlie"],
  "defaultSplit": {
    "type": "percentage",
    "participants": [
      { "name": "Me", "value": 50 },
      { "name": "Alice", "value": 50 }
    ]
  },
  "filters": { "startDate": "2025-01-01", "endDate": "2025-12-31" }
}
```

**File conventions (automatic, no config needed):**
- Drop your CSV as `input/sample.csv` → loaded by "Load Sample Data"
- State auto-saves to `output/audit-state.json`
- Exports go to `output/`

## 📊 CSV Format

Your CSV must have these columns:
```csv
Date,Description,Amount,Institution,Account_Type,Account_Name
2026-01-31,Groceries,50.00,Bank,Chequing,Main
2026-02-01,Restaurant,-35.50,Bank,Credit Card,Visa
```

**Rules:**
- `Date` must be YYYY-MM-DD
- `Amount` can be positive or negative
- All columns required

## ✨ Features

- **No Data Uploaded** - Everything stays local
- **Auto-Save** - State saved every 500ms
- **Resumable** - Download state, resume later
- **Dark Mode** - Auto-detect system preference
- **Split Smart** - Percentage, equal, or absolute splits
- **Export Clean** - CSV ready for spreadsheets

## 🆘 Common Issues

### "Load Sample Data" doesn't work
→ Make sure server is running (`node server.js`)

### CSV won't upload
→ Check columns: Date, Description, Amount, Institution, Account_Type, Account_Name

### Exports not saving
→ Check `output/` folder exists

### State lost on refresh
→ Download state via "Save State" button, or use server mode

## 🎯 Typical Workflow

```
1. node server.js                    (Start server)
2. Open http://localhost:3000        (Load app)
3. Click "Load Sample Data"           (Get CSV)
4. Click "Start Audit Session"        (Begin audit)
5. → (Keep) / ← (Discard)           (Process transactions)
6. Toggle "Split" for shared costs    (Optional)
7. Click Export buttons               (Download results)
```

## 📦 What Gets Exported

### processed-transactions.csv
Your audit decisions for every transaction

### split-ledger.csv
Who owes whom breakdown

### audit-state.json
Your full session (can be loaded later)

---

**Need help?** Check README.md for full documentation.
