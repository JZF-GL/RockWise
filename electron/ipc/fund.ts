import { IpcMainInvokeEvent } from 'electron';
import Database from 'better-sqlite3';
import path from 'path';

// 初始化数据库
const db = new Database(path.join(__dirname, '../../data/fund.db'));

// 创建基金数据表
db.exec(`
  CREATE TABLE IF NOT EXISTS funds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    net_value REAL,
    update_time TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL DEFAULT '默认账户',
    balance REAL NOT NULL DEFAULT 1000,
    initial_balance REAL NOT NULL DEFAULT 1000,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER NOT NULL DEFAULT 1,
    fund_code TEXT NOT NULL,
    fund_name TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('buy', 'sell')),
    amount REAL NOT NULL,
    nav REAL NOT NULL,
    shares REAL NOT NULL,
    status TEXT DEFAULT 'completed',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (account_id) REFERENCES accounts(id)
  );

  CREATE TABLE IF NOT EXISTS positions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER NOT NULL DEFAULT 1,
    fund_code TEXT NOT NULL,
    fund_name TEXT NOT NULL,
    shares REAL NOT NULL DEFAULT 0,
    avg_cost REAL NOT NULL DEFAULT 0,
    total_cost REAL NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(account_id, fund_code),
    FOREIGN KEY (account_id) REFERENCES accounts(id)
  );

  CREATE INDEX IF NOT EXISTS idx_orders_account ON orders(account_id);
  CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_positions_account ON positions(account_id);
`);

// 确保默认账户存在
const defaultAccount = db.prepare('SELECT id FROM accounts WHERE id = 1').get();
if (!defaultAccount) {
  db.prepare('INSERT INTO accounts (name, balance, initial_balance) VALUES (?, ?, ?)').run('默认账户', 1000, 1000);
}

export async function getFundData(event: IpcMainInvokeEvent, fundCode?: string) {
  try {
    if (fundCode) {
      // 获取单只基金数据
      const stmt = db.prepare('SELECT * FROM funds WHERE code = ?');
      return stmt.get(fundCode);
    } else {
      // 获取所有基金数据
      const stmt = db.prepare('SELECT * FROM funds');
      return stmt.all();
    }
  } catch (error) {
    console.error('获取基金数据失败:', error);
    throw error;
  }
}

export async function saveFundData(event: IpcMainInvokeEvent, fundData: any) {
  try {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO funds (code, name, net_value, update_time)
      VALUES (?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      fundData.code,
      fundData.name,
      fundData.net_value,
      fundData.update_time
    );
    
    return { success: true, id: result.lastInsertRowid };
  } catch (error) {
    console.error('保存基金数据失败:', error);
    throw error;
  }
}