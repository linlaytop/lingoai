// Compatibility layer - redirects to local auth/db systems
// This allows existing components that import from firebase.ts to work without changes

import { localAuth, type LocalUser } from './localAuth';
import { localDb } from './localDb';

// Re-export for compatibility
export { localAuth as auth };
export { localDb as db };
export type { LocalUser as User } from './localAuth';

// Compatibility: signInWithGoogle -> redirects to login page
export const signInWithGoogle = async () => {
  throw new Error('请使用邮箱密码登录');
};

// Compatibility: error handler
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`DB Error (${operationType}) at ${path}:`, message);
  throw new Error(`数据操作失败 (${operationType}): ${message}`);
}
