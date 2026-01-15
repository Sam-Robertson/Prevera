import { Injectable } from "@nestjs/common";

@Injectable()
export class SesService {
  private client: any;

  constructor() {
    const region = process.env.AWS_REGION;
    const { SESClient } = require("@aws-sdk/client-ses");
    this.client = new SESClient({ region });
  }

  async sendInviteEmail(args: {
    to: string;
    inviteUrl: string;
    clinicName?: string | null;
    role: string;
  }) {
    const from = process.env.SES_FROM_EMAIL;
    if (!from) {
      throw new Error("Missing SES_FROM_EMAIL");
    }

    const subject = args.clinicName ? `You\"re invited to ${args.clinicName}` : "You\"re invited";
    const bodyText =
      `You have been invited to join ${args.clinicName ?? "a clinic"} as ${args.role}.\n\n` +
      `Accept your invite: ${args.inviteUrl}\n\n` +
      `If you did not expect this email, you can ignore it.`;

    const { SendEmailCommand } = require("@aws-sdk/client-ses");
    const cmd = new SendEmailCommand({
      Source: from,
      Destination: { ToAddresses: [args.to] },
      Message: {
        Subject: { Data: subject },
        Body: { Text: { Data: bodyText } },
      },
    });

    await this.client.send(cmd);
  }
}
