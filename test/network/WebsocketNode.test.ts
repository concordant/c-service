import {WebSocketServerEndpoint} from "../../src/Network/EndpointImpl/WebSocketServerEndpoint";
import {Handler, IAsyncDuplexEndpoint, IHandlerResp} from "../../src/Network/Interfaces/IAsyncDuplexEndpoint";
import {RemoteEndpoint, Protocol} from "../../src/Network/utils/NetworkCommon";

describe("Client/Server connection", () => {

    const NODE_1_PORT = 44900;
    const NODE_2_PORT = 45900;
    let server1: IAsyncDuplexEndpoint;
    let server2: IAsyncDuplexEndpoint;

    it("Create Server", () => {
        server1 = new WebSocketServerEndpoint(NODE_1_PORT, {});
    });

    it("Create Server and check connection and open events", (done) => {

        let counter = 0;

        const onConnection = (): IHandlerResp => {
            console.log("Called onServerConnection");
            counter++;
            return {state: "listening"};
        };

        const onOpen = (): IHandlerResp => {
            console.log("open");
            if (counter === 1) {
                done();
            }
            return {state: "listening"};
        };

        server1 = new WebSocketServerEndpoint(NODE_1_PORT, {connection: [onConnection]});
        server2 = new WebSocketServerEndpoint(NODE_2_PORT);
        server2.connect({
            address: "localhost",
            port: NODE_1_PORT,
            protocol: Protocol.WEBSOCKET,
        }, {open: [onOpen]}).then();
    });

    it("Exchange Messages Between two servers", (done) => {

        let foobar = "";
        const onServerMessage: Handler = (endpoint: RemoteEndpoint, messageJSON: any, ...args: any) => {
            const message = JSON.parse(messageJSON);
            foobar += message.content;
            endpoint.send({content: "bar"});
            return {state: "listening", response: undefined};
        };

        const onClientMessage: Handler = (endpoint: RemoteEndpoint, messageJSON: any, ...args: any) => {
            const message = JSON.parse(messageJSON);
            foobar += message.content;
            expect(foobar).toEqual("foobar");
            done();
            return {state: "listening", response: undefined};
        };

        const onServerConnection: Handler = (): IHandlerResp => {
            return {state: "listening"};
        };

        const onClientConnectionOpen: Handler = (endpoint: RemoteEndpoint, ...args: any) => {
            server2.send({content: "foo"}, endpoint).then();
            return {state: "listening"};
        };

        const server1Handlers = {message: [onServerMessage], connection: [onServerConnection]};

        server1 = new WebSocketServerEndpoint(NODE_1_PORT, server1Handlers);
        server2 = new WebSocketServerEndpoint(NODE_2_PORT, {});

        server2.connect({address: "localhost", port: NODE_1_PORT, protocol: Protocol.WEBSOCKET},
            {
                message: [onClientMessage],
                open: [onClientConnectionOpen],
            })
            .then();
    });

    // TODO: close socket after state "stop" ensure socket is closed in both sides

    afterEach(() => {
        if (server1 !== undefined) {
            server1.close().then(() => "ok");
        }
        if (server2 !== undefined) {
            server2.close().then(() => "ok");
        }
    });

});
