import { IpcMainInvokeEvent } from 'electron';
import Database from 'better-sqlite3';
import path from 'path';

const db = new Database(path.join(__dirname, '../../data/fund.db'));

// 获取账户信息
export async function getAccount(event: IpcMainInvokeEvent, accountId?: number) {
  try {
    const id = accountId || 1;
    const account = db.prepare('SELECT * FROM accounts WHERE id = ?').get(id);
    if (!account) {
      // 自动创建默认账户
      db.prepare('INSERT INTO accounts (id, name, balance, initial_balance) VALUES (?, ?, ?, ?)').run(id, '默认账户', 1000000, 1000000);
      return db.prepare('SELECT * FROM accounts WHERE id = ?').get(id);
    }
    return account;
  } catch (error) {
    console.error('获取账户失败:', error);
    throw error;
  }
}

// 创建账户
export async function createAccount(event: IpcMainInvokeEvent, data: { name: string; balance: number }) {
  try {
    const result = db.prepare('INSERT INTO accounts (name, balance, initial_balance) VALUES (?, ?, ?)').run(data.name, data.balance, data.balance);
    return db.prepare('SELECT * FROM accounts WHERE id = ?').get(result.lastInsertRowid);
  } catch (error) {
    console.error('创建账户失败:', error);
    throw error;
  }
}

// 买入基金
export async function buyFund(event: IpcMainInvokeEvent, data: {
  accountId: number;
  fundCode: string;
  fundName: string;
  amount: number;
  nav: number;
}) {
  try {
    const { accountId, fundCode, fundName, amount, nav } = data;
    if (amount <= 0 || nav <= 0) throw new Error('金额和净值必须大于0');

    const buyTransaction = db.transaction(() => {
      // 获取账户
      const account = db.prepare('SELECT * FROM accounts WHERE id = ?').get(accountId) as any;
      if (!account) throw new Error('账户不存在');
      if (account.balance < amount) throw new Error('余额不足');

      // 计算份额（保留2位小数）
      const shares = Math.floor(amount / nav * 100) / 100;
      if (shares <= 0) throw new Error('份额计算结果为0');

      // 扣减余额
      db.prepare('UPDATE accounts SET balance = balance - ?, updated_at = datetime("now") WHERE id = ?').run(amount, accountId);

      // 更新或创建持仓
      const existingPosition = db.prepare('SELECT * FROM positions WHERE account_id = ? AND fund_code = ?').get(accountId, fundCode) as any;
      let position;
      if (existingPosition) {
        const newShares = existingPosition.shares + shares;
        const newTotalCost = existingPosition.total_cost + amount;
        const newAvgCost = newTotalCost / newShares;
        db.prepare('UPDATE positions SET shares = ?, avg_cost = ?, total_cost = ?, updated_at = datetime("now") WHERE id = ?').run(newShares, newAvgCost, newTotalCost, existingPosition.id);
        position = db.prepare('SELECT * FROM positions WHERE id = ?').get(existingPosition.id);
      } else {
        db.prepare('INSERT INTO positions (account_id, fund_code, fund_name, shares, avg_cost, total_cost) VALUES (?, ?, ?, ?, ?, ?)').run(accountId, fundCode, fundName, shares, nav, amount);
        position = db.prepare('SELECT * FROM positions WHERE account_id = ? AND fund_code = ?').get(accountId, fundCode);
      }

      // 写入订单
      const orderResult = db.prepare('INSERT INTO orders (account_id, fund_code, fund_name, type, amount, nav, shares) VALUES (?, ?, ?, "buy", ?, ?, ?)').run(accountId, fundCode, fundName, amount, nav, shares);
      const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderResult.lastInsertRowid);

      return { order, position };
    });

    return buyTransaction();
  } catch (error) {
    console.error('买入失败:', error);
    throw error;
  }
}

// 卖出基金
export async function sellFund(event: IpcMainInvokeEvent, data: {
  accountId: number;
  fundCode: string;
  fundName: string;
  shares: number;
  nav: number;
}) {
  try {
    const { accountId, fundCode, fundName, shares, nav } = data;
    if (shares <= 0 || nav <= 0) throw new Error('份额和净值必须大于0');

    const sellTransaction = db.transaction(() => {
      // 获取账户
      const account = db.prepare('SELECT * FROM accounts WHERE id = ?').get(accountId) as any;
      if (!account) throw new Error('账户不存在');

      // 获取持仓
      const position = db.prepare('SELECT * FROM positions WHERE account_id = ? AND fund_code = ?').get(accountId, fundCode) as any;
      if (!position) throw new Error('无持仓');
      if (position.shares < shares) throw new Error('持仓份额不足');

      // 计算收入
      const proceeds = Math.floor(shares * nav * 100) / 100;

      // 增加余额
      db.prepare('UPDATE accounts SET balance = balance + ?, updated_at = datetime("now") WHERE id = ?').run(proceeds, accountId);

      // 更新持仓
      const remainingShares = Math.floor((position.shares - shares) * 100) / 100;
      if (remainingShares <= 0) {
        // 全部卖出，删除持仓
        db.prepare('DELETE FROM positions WHERE id = ?').run(position.id);
      } else {
        // 部分卖出，按比例减少成本
        const costRatio = remainingShares / position.shares;
        const newTotalCost = Math.floor(position.total_cost * costRatio * 100) / 100;
        db.prepare('UPDATE positions SET shares = ?, total_cost = ?, updated_at = datetime("now") WHERE id = ?').run(remainingShares, newTotalCost, position.id);
      }

      // 写入订单
      const orderResult = db.prepare('INSERT INTO orders (account_id, fund_code, fund_name, type, amount, nav, shares) VALUES (?, ?, ?, "sell", ?, ?, ?)').run(accountId, fundCode, fundName, proceeds, nav, shares);
      const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderResult.lastInsertRowid);

      // 返回更新后的持仓（可能已删除）
      const updatedPosition = db.prepare('SELECT * FROM positions WHERE account_id = ? AND fund_code = ?').get(accountId, fundCode);

      return { order, position: updatedPosition || null };
    });

    return sellTransaction();
  } catch (error) {
    console.error('卖出失败:', error);
    throw error;
  }
}

// 获取订单历史
export async function getOrders(event: IpcMainInvokeEvent, data?: { accountId?: number; limit?: number }) {
  try {
    const accountId = data?.accountId || 1;
    const limit = data?.limit || 100;
    const orders = db.prepare('SELECT * FROM orders WHERE account_id = ? ORDER BY created_at DESC LIMIT ?').all(accountId, limit);
    return orders;
  } catch (error) {
    console.error('获取订单失败:', error);
    throw error;
  }
}

// 获取持仓列表
export async function getPositions(event: IpcMainInvokeEvent, data?: { accountId?: number }) {
  try {
    const accountId = data?.accountId || 1;
    const positions = db.prepare('SELECT * FROM positions WHERE account_id = ? AND shares > 0 ORDER BY total_cost DESC').all(accountId);
    return positions;
  } catch (error) {
    console.error('获取持仓失败:', error);
    throw error;
  }
}
