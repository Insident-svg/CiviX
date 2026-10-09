declare module 'nodemailer' {
  const nodemailer: {
    createTransport(options: any): {
      sendMail(options: any): Promise<any>;
      verify(): Promise<any>;
    };
  };
  export default nodemailer;
}

declare module 'ejs' {
  const ejs: {
    renderFile(path: string, data: Record<string, unknown>): Promise<string>;
  };
  export default ejs;
}
