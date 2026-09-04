import { env } from "./env.js";

export const otpProviderConfig = {
  provider: env.OTP_PROVIDER,
  twilio: {
    accountSid: env.TWILIO_ACCOUNT_SID,
    authToken: env.TWILIO_AUTH_TOKEN,
    phoneNumber: env.TWILIO_PHONE_NUMBER
  },
  msg91: {
    authKey: env.MSG91_AUTH_KEY
  }
};
