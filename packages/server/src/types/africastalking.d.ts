declare module "africastalking" {
  interface ATOptions {
    apiKey: string;
    username: string;
  }

  interface SMSSendOptions {
    to: string[];
    message: string;
    from?: string;
  }

  interface VoiceCallOptions {
    callTo: string[];
    callFrom: string;
  }

  interface SMS {
    send(options: SMSSendOptions): Promise<{
      SMSMessageData?: {
        Recipients?: Array<{ messageId: string }>;
      };
    }>;
  }

  interface Voice {
    call(options: VoiceCallOptions): Promise<{
      entries?: Array<{ sessionId: string }>;
    }>;
  }

  interface AT {
    SMS: SMS;
    VOICE: Voice;
  }

  function AfricasTalking(options: ATOptions): AT;
  export = AfricasTalking;
}
