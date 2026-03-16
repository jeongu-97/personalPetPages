#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const helpText = `
관리자 비밀번호 변경 스크립트

사용법:
  npm run set-admin-password -- --email you@example.com --password 'new-password'
  npm run set-admin-password -- --id USER_UID --password 'new-password'

옵션:
  --email      대상 사용자 이메일
  --id         대상 사용자 UID
  --password   새 비밀번호
  --help       도움말 출력

환경변수:
  SUPABASE_URL 또는 VITE_SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY

참고:
  - .env 와 .env.local 을 자동으로 읽습니다.
  - 쉘 히스토리에 비밀번호를 남기기 싫으면 일회성 환경변수로 실행하세요.
    ADMIN_NEW_PASSWORD='new-password' npm run set-admin-password -- --email you@example.com
`;

const parseEnvFile = (filePath) => {
  if (!fs.existsSync(filePath)) return {};

  const raw = fs.readFileSync(filePath, 'utf8');
  const lines = raw.split(/\r?\n/);
  const env = {};

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex <= 0) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }

  return env;
};

const getRuntimeEnv = () => {
  const envFromFiles = {
    ...parseEnvFile(path.join(projectRoot, '.env')),
    ...parseEnvFile(path.join(projectRoot, '.env.local')),
  };

  return {
    ...envFromFiles,
    ...process.env,
  };
};

const parseArgs = (argv) => {
  const parsed = {};

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    if (!current.startsWith('--')) continue;

    const [rawKey, inlineValue] = current.split('=');
    const key = rawKey.slice(2);
    if (!key) continue;

    if (inlineValue !== undefined) {
      parsed[key] = inlineValue;
      continue;
    }

    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      parsed[key] = 'true';
      continue;
    }

    parsed[key] = next;
    index += 1;
  }

  return parsed;
};

const exitWithError = (message) => {
  console.error(message);
  process.exit(1);
};

const args = parseArgs(process.argv.slice(2));
if (args.help === 'true') {
  console.log(helpText.trim());
  process.exit(0);
}

const runtimeEnv = getRuntimeEnv();
const supabaseUrl = runtimeEnv.SUPABASE_URL || runtimeEnv.VITE_SUPABASE_URL || '';
const serviceRoleKey = runtimeEnv.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !serviceRoleKey) {
  exitWithError('SUPABASE_URL/VITE_SUPABASE_URL 및 SUPABASE_SERVICE_ROLE_KEY 설정이 필요합니다.');
}

const inputEmail = typeof args.email === 'string' ? args.email.trim().toLowerCase() : '';
const inputUserId = typeof args.id === 'string' ? args.id.trim() : '';
const nextPassword =
  (typeof args.password === 'string' ? args.password : runtimeEnv.ADMIN_NEW_PASSWORD || '').trim();

if (!inputEmail && !inputUserId) {
  exitWithError('--email 또는 --id 중 하나는 꼭 넣어야 합니다.\n\n' + helpText.trim());
}

if (!nextPassword) {
  exitWithError('--password 또는 ADMIN_NEW_PASSWORD 값이 필요합니다.');
}

if (nextPassword.length < 6) {
  exitWithError('비밀번호는 최소 6자 이상으로 설정하세요.');
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

const findUserIdByEmail = async (email) => {
  const perPage = 200;

  for (let page = 1; page <= 50; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      exitWithError(`사용자 조회에 실패했습니다: ${error.message}`);
    }

    const users = data?.users ?? [];
    const found = users.find((user) => (user.email ?? '').trim().toLowerCase() === email);
    if (found?.id) {
      return found.id;
    }

    if (users.length < perPage) {
      break;
    }
  }

  return '';
};

const targetUserId = inputUserId || (await findUserIdByEmail(inputEmail));
if (!targetUserId) {
  exitWithError(`대상 사용자를 찾지 못했습니다: ${inputEmail}`);
}

const { data, error } = await supabase.auth.admin.updateUserById(targetUserId, {
  password: nextPassword,
});

if (error) {
  exitWithError(`비밀번호 변경에 실패했습니다: ${error.message}`);
}

console.log('비밀번호를 변경했습니다.');
console.log(`UID: ${data.user.id}`);
if (data.user.email) {
  console.log(`Email: ${data.user.email}`);
}
