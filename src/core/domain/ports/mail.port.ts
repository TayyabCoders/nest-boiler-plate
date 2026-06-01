export interface IMailProvider {
  sendEmail(to: string, subject: string, body: string, isHtml?: boolean): Promise<void>;
}
