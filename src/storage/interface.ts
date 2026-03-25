export interface User {
  id: string;
  oauthSub: string;
  createdAt: Date;
}

export interface EmailAccount {
  id: string;
  userId: string;
  name: string;
  email: string;
  provider: string;
  imapHost: string;
  imapPort: number;
  imapSecure: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  username: string;
  passwordEnc: string;
  isDefault: boolean;
  createdAt: Date;
}

export interface CreateAccountInput {
  name: string;
  email: string;
  provider: string;
  imapHost: string;
  imapPort: number;
  imapSecure: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  username: string;
  password: string;
}

export interface StorageAdapter {
  findOrCreateUser(sub: string): Promise<User>;
  listAccounts(userId: string): Promise<EmailAccount[]>;
  getAccount(userId: string, accountId: string): Promise<EmailAccount | null>;
  createAccount(userId: string, data: CreateAccountInput): Promise<EmailAccount>;
  updateAccount(
    userId: string,
    accountId: string,
    data: Partial<CreateAccountInput>,
  ): Promise<EmailAccount>;
  deleteAccount(userId: string, accountId: string): Promise<void>;
  setDefaultAccount(userId: string, accountId: string): Promise<void>;
}
