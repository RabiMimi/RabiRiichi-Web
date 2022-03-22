export class RiichiClient {
  public constructor(public serverAddress: string) {
    if (!serverAddress.startsWith('http')) {
      this.serverAddress = `https://${serverAddress}`;
    }
  }

  public async verifyServer(): Promise<boolean> {
    const tryWithHttp = async () => {
      if (this.serverAddress.startsWith('http://')) {
        return false;
      }
      if (this.serverAddress.startsWith('https://')) {
        this.serverAddress = 'http://' + this.serverAddress.substring(8);
        return this.verifyServer();
      }
      return false;
    };
    try {
      const resp = await fetch(`${this.serverAddress}/rabiriichi/info`);
      if (!resp.ok) {
        return tryWithHttp();
      }
    } catch (e) {
      return tryWithHttp();
    }
    return true;
  }
}
