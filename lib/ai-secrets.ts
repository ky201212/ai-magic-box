import "server-only";
import crypto from "node:crypto";
import {
  getSiteSettingValue,
  upsertSiteSettings,
  type AiSecretAuditRecord,
  type AiSecretSecuritySummary,
  type AiSecretStatusRecord,
} from "@/lib/admin-data";

type StoredAiSecretRecord = {
  envName: string;
  encryptedValue: string;
  iv: string;
  updatedAt: string;
};

type StoredAiSecretSetting = {
  secrets: StoredAiSecretRecord[];
};

type StoredAiSecretAuditSetting = {
  logs: AiSecretAuditRecord[];
};

function resolveAiSecretMasterKeySource() {
  if (process.env.AI_SECRET_MASTER_KEY) {
    return "dedicated" as const;
  }

  if (process.env.AUTH_SESSION_SECRET) {
    return "fallback" as const;
  }

  return "missing" as const;
}

function getAiSecretMasterKey() {
  const secret =
    process.env.AI_SECRET_MASTER_KEY ?? process.env.AUTH_SESSION_SECRET;

  if (!secret) {
    throw new Error("缺少 AI_SECRET_MASTER_KEY 或 AUTH_SESSION_SECRET 环境变量。");
  }

  return crypto.createHash("sha256").update(secret).digest();
}

async function appendAiSecretAuditLog(input: {
  envName: string;
  action: "save" | "delete";
  actorUserId: string;
  actorDisplayName: string;
  actorPhone: string;
}) {
  const current = await getSiteSettingValue<StoredAiSecretAuditSetting>(
    "ai.secret-audit",
    { logs: [] },
  );
  const nextLog: AiSecretAuditRecord = {
    id: crypto.randomUUID(),
    envName: input.envName,
    action: input.action,
    actorUserId: input.actorUserId,
    actorDisplayName: input.actorDisplayName,
    actorPhone: input.actorPhone,
    createdAt: new Date().toISOString(),
  };

  await upsertSiteSettings([
    {
      setting_key: "ai.secret-audit",
      setting_group: "ai",
      label: "AI 密钥操作审计日志",
      value: {
        logs: [nextLog, ...(current.logs ?? [])].slice(0, 80),
      },
      description: "记录后台 AI 密钥的新增、覆盖、删除操作。",
      updated_by: input.actorUserId,
    },
  ]);
}

function encryptSecret(value: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getAiSecretMasterKey(), iv);
  const encrypted =
    cipher.update(value, "utf8", "base64") + cipher.final("base64");
  const authTag = cipher.getAuthTag().toString("base64");

  return {
    encryptedValue: encrypted,
    iv: iv.toString("base64"),
    authTag,
  };
}

function decryptSecret(input: {
  encryptedValue: string;
  iv: string;
  authTag: string;
}) {
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    getAiSecretMasterKey(),
    Buffer.from(input.iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(input.authTag, "base64"));

  return (
    decipher.update(input.encryptedValue, "base64", "utf8") +
    decipher.final("utf8")
  );
}

function splitStoredValue(rawValue: string) {
  const [authTag, encryptedValue] = rawValue.split(":");

  if (!authTag || !encryptedValue) {
    return null;
  }

  return { authTag, encryptedValue };
}

export async function getStoredAiSecrets() {
  const setting = await getSiteSettingValue<StoredAiSecretSetting>(
    "ai.secret-store",
    { secrets: [] },
  );

  return setting.secrets ?? [];
}

export async function getAiSecret(envName: string) {
  const storedSecrets = await getStoredAiSecrets();
  const matchedSecret = storedSecrets.find((item) => item.envName === envName);

  if (matchedSecret) {
    const splitValue = splitStoredValue(matchedSecret.encryptedValue);

    if (!splitValue) {
      return "";
    }

    try {
      return decryptSecret({
        encryptedValue: splitValue.encryptedValue,
        iv: matchedSecret.iv,
        authTag: splitValue.authTag,
      });
    } catch (error) {
      console.error("【AI 密钥解密失败】:", error);
      return "";
    }
  }

  return process.env[envName] ?? "";
}

export async function upsertAiSecret(input: {
  envName: string;
  plainTextValue: string;
  updatedBy: string;
  actorDisplayName: string;
  actorPhone: string;
}) {
  if (resolveAiSecretMasterKeySource() === "missing") {
    throw new Error("缺少 AI_SECRET_MASTER_KEY，当前不允许保存后台 AI 密钥。");
  }

  const encrypted = encryptSecret(input.plainTextValue.trim());
  const storedSecrets = await getStoredAiSecrets();
  const updatedAt = new Date().toISOString();
  const nextSecrets = [
    ...storedSecrets.filter((item) => item.envName !== input.envName),
    {
      envName: input.envName,
      encryptedValue: `${encrypted.authTag}:${encrypted.encryptedValue}`,
      iv: encrypted.iv,
      updatedAt,
    },
  ];

  await upsertSiteSettings([
    {
      setting_key: "ai.secret-store",
      setting_group: "ai",
      label: "AI 密钥保险箱",
      value: { secrets: nextSecrets },
      description: "后台录入并加密保存的 AI 接口密钥。",
      updated_by: input.updatedBy,
    },
  ]);

  await appendAiSecretAuditLog({
    envName: input.envName,
    action: "save",
    actorUserId: input.updatedBy,
    actorDisplayName: input.actorDisplayName,
    actorPhone: input.actorPhone,
  });

  return updatedAt;
}

export async function deleteAiSecret(input: {
  envName: string;
  updatedBy: string;
  actorDisplayName: string;
  actorPhone: string;
}) {
  const storedSecrets = await getStoredAiSecrets();
  const nextSecrets = storedSecrets.filter((item) => item.envName !== input.envName);

  await upsertSiteSettings([
    {
      setting_key: "ai.secret-store",
      setting_group: "ai",
      label: "AI 密钥保险箱",
      value: { secrets: nextSecrets },
      description: "后台录入并加密保存的 AI 接口密钥。",
      updated_by: input.updatedBy,
    },
  ]);

  await appendAiSecretAuditLog({
    envName: input.envName,
    action: "delete",
    actorUserId: input.updatedBy,
    actorDisplayName: input.actorDisplayName,
    actorPhone: input.actorPhone,
  });
}

export async function listAiSecretStatuses(
  envNames: string[],
): Promise<AiSecretStatusRecord[]> {
  const storedSecrets = await getStoredAiSecrets();
  const storedMap = new Map(storedSecrets.map((item) => [item.envName, item]));

  return Array.from(new Set(envNames))
    .filter((envName) => envName.trim().length > 0)
    .map((envName) => {
      const fromEnv = process.env[envName];
      const fromStore = storedMap.get(envName);

      if (fromStore) {
        return {
          envName,
          available: true,
          source: "database" as const,
          updatedAt: fromStore.updatedAt,
        };
      }

      if (fromEnv) {
        return {
          envName,
          available: true,
          source: "environment" as const,
          updatedAt: null,
        };
      }

      return {
        envName,
        available: false,
        source: "missing" as const,
        updatedAt: null,
      };
    });
}

export async function listAiSecretAuditLogs() {
  const current = await getSiteSettingValue<StoredAiSecretAuditSetting>(
    "ai.secret-audit",
    { logs: [] },
  );

  return current.logs ?? [];
}

export function getAiSecretSecuritySummary(): AiSecretSecuritySummary {
  const masterKeySource = resolveAiSecretMasterKeySource();

  return {
    masterKeySource,
    storageEncryptionEnabled: masterKeySource !== "missing",
    warningMessage:
      masterKeySource === "fallback"
        ? "当前后台密钥加密仍在复用登录密钥，建议尽快单独配置 AI_SECRET_MASTER_KEY。"
        : masterKeySource === "missing"
          ? "当前缺少 AI_SECRET_MASTER_KEY，后台密钥保险箱应暂停使用，先补环境变量。"
          : null,
  };
}
