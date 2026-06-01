export interface IPushNotificationProvider {
  send(userId: string, payload: { title: string; body: string; data?: any }): Promise<void>;
}
