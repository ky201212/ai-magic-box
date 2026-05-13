import "server-only";
import Dysmsapi20170525 from "@alicloud/dysmsapi20170525";
import * as OpenApi from "@alicloud/openapi-client";
import { SendSmsRequest } from "@alicloud/dysmsapi20170525";

function getAliyunSmsClient() {
  const accessKeyId = process.env.ALIYUN_ACCESS_KEY_ID;
  const accessKeySecret = process.env.ALIYUN_ACCESS_KEY_SECRET;

  if (!accessKeyId || !accessKeySecret) {
    throw new Error("缺少阿里云短信环境变量。");
  }

  const config = new OpenApi.Config({
    accessKeyId,
    accessKeySecret,
    endpoint: "dysmsapi.aliyuncs.com",
  });

  return new Dysmsapi20170525(config);
}

export async function sendVerificationSms(
  phone: string,
  code: string,
  expireMinutes: number,
) {
  const signName = process.env.ALIYUN_SMS_SIGN_NAME;
  const templateCode = process.env.ALIYUN_SMS_TEMPLATE_CODE;

  if (!signName || !templateCode) {
    throw new Error("缺少短信签名或模板环境变量。");
  }

  const client = getAliyunSmsClient();

  const request = new SendSmsRequest({
    phoneNumbers: phone,
    signName,
    templateCode,
    templateParam: JSON.stringify({
      code,
      time: expireMinutes,
    }),
  });

  return client.sendSms(request);
}
