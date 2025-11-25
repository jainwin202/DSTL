import WebSocket, { WebSocketServer } from "ws";

const MSG = {
  REQUEST_CHAIN: "REQUEST_CHAIN",
  CHAIN: "CHAIN",
  NEW_BLOCK: "NEW_BLOCK",
  NEW_TX: "NEW_TX",
};

export class P2P {
  constructor({ blockchain, p2pPort, peers }) {
    this.blockchain = blockchain;
    this.sockets = [];
    this.server = new WebSocketServer({ port: p2pPort });

    this.server.on("connection", (ws) => this.initSocket(ws));
    (peers || []).forEach((addr) => this.connectToPeer(addr));

    console.log(`[p2p] listening on ${p2pPort}`);
  }

  connectToPeer(address) {
    const ws = new WebSocket(address);
    ws.on("open", () => this.initSocket(ws));
    ws.on("error", () => {}); // ignore dead peers
  }

  initSocket(ws) {
    this.sockets.push(ws);
    ws.on("message", (msg) => this.onMessage(ws, msg));
    ws.on("close", () => {
      this.sockets = this.sockets.filter((s) => s !== ws);
    });

    this.send(ws, { type: MSG.REQUEST_CHAIN });
  }

  send(ws, data) {
    try {
      ws.send(JSON.stringify(data));
    } catch {}
  }

  broadcast(data) {
    this.sockets.forEach((s) => this.send(s, data));
  }

  async onMessage(ws, msgRaw) {
    let msg;
    try {
      msg = JSON.parse(msgRaw.toString());
    } catch {
      return;
    }

    switch (msg.type) {
      case MSG.REQUEST_CHAIN:
        this.send(ws, { type: MSG.CHAIN, data: this.blockchain.chain });
        break;

      case MSG.CHAIN:
        await this.blockchain.replaceChain(msg.data);
        break;

      case MSG.NEW_BLOCK:
        await this.blockchain.replaceChain(msg.data);
        break;

      case MSG.NEW_TX:
        try {
          this.blockchain.addTransaction(msg.data);
        } catch {}
        break;
    }
  }

  broadcastTx(tx) {
    this.broadcast({ type: MSG.NEW_TX, data: tx });
  }

  broadcastNewBlock() {
    this.broadcast({ type: MSG.NEW_BLOCK, data: this.blockchain.chain });
  }
}
