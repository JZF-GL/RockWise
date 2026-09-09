export const MY_FUNDS_STORAGE_KEY = 'my_funds';

export const getMyFunds = (): string[] => {
  try {
    return JSON.parse(
      localStorage.getItem(MY_FUNDS_STORAGE_KEY) ||
        '["000001","110011","163406","000961","270002"]'
    );
  } catch {
    return ['000001', '110011', '163406', '000961', '270002'];
  }
};

export const saveMyFunds = (codes: string[]) => {
  localStorage.setItem(MY_FUNDS_STORAGE_KEY, JSON.stringify(codes));
};

export const isFundInMyFunds = (code: string): boolean => {
  const codes = getMyFunds();
  return codes.includes(code);
};

export const addFundToMyFunds = (code: string): { success: boolean; alreadyExists: boolean } => {
  const codes = getMyFunds();
  if (codes.includes(code)) {
    return { success: false, alreadyExists: true };
  }
  const newCodes = [...codes, code];
  saveMyFunds(newCodes);
  return { success: true, alreadyExists: false };
};

export const removeFundFromMyFunds = (code: string): boolean => {
  const codes = getMyFunds();
  const newCodes = codes.filter((c) => c !== code);
  saveMyFunds(newCodes);
  return true;
};
