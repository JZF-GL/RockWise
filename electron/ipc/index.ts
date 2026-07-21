import { ipcMain } from 'electron';
import { getFundData, saveFundData } from './fund';
import { getAccount, createAccount, buyFund, sellFund, getOrders, getPositions } from './trading';

export function setupIPC() {
  // 基金数据相关IPC
  ipcMain.handle('getFundData', getFundData);
  ipcMain.handle('saveFundData', saveFundData);

  // 虚拟交易IPC
  ipcMain.handle('trading:getAccount', getAccount);
  ipcMain.handle('trading:createAccount', createAccount);
  ipcMain.handle('trading:buy', buyFund);
  ipcMain.handle('trading:sell', sellFund);
  ipcMain.handle('trading:getOrders', getOrders);
  ipcMain.handle('trading:getPositions', getPositions);
}
