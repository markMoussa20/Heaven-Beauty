declare module "nodemailer" {
  type TransportOptions = Record<string, unknown>;
  type MailMessage = Record<string, unknown>;

  const nodemailer: {
    createTransport: (options: TransportOptions) => {
      sendMail: (message: MailMessage) => Promise<unknown>;
    };
  };

  export default nodemailer;
}
