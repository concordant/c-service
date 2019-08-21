import {State, WebSocketNode} from "../../src/Network/EndpointImpl/WebsocketNode";
import {INode, INodeResponse} from "../../src/Network/Interfaces/INode";
import {Endpoint, IMessage, INodeInfo} from "../../src/Network/utils/NetworkCommon";

describe("Client/Server connection", () => {

    const NODE_1_PORT = 44900;
    const NODE_2_PORT = 45900;
    let server1: INode;
    let server2: INode;

    it("Create Server", () => {
        server1 = new WebSocketNode(NODE_1_PORT, {});
    });

    it("Create Server with handle connection", (done) => {
        const onConnection = (...args: any) => {
            console.log("Called onServerConnection");
            done();
            return {state: "listening", response: undefined};
        };
        server1 = new WebSocketNode(NODE_1_PORT, {connection: [onConnection]});
        server2 = new WebSocketNode(NODE_2_PORT, {
            open: [
                (): any => {
                    console.log("open");
                    return {state: "listening"};
                }],
        });
        server2.connect("localhost", NODE_1_PORT).then(() => {
            return;
        });
    });

    it("Exchange Messages Between two servers", (done) => {

        let foobar = "";
        const onServerMessage = (endpoint: Endpoint, messageJSON: any, ...args: any) => {
            const message = JSON.parse(messageJSON);
            foobar += message.content;
            endpoint.send(JSON.stringify({content: "bar"}));
            return {state: "listening", response: undefined};
        };

        const onClientMessage = (endpoint: Endpoint, messageJSON: any, ...args: any) => {
            const message = JSON.parse(messageJSON);
            foobar += message.content;
            expect(foobar).toEqual("foobar");
            done();
            return {state: "listening", response: undefined};
        };

        const onServerConnection = (...args: any): INodeResponse => {
            return {state: "listening", response: undefined};
        };

        const onClientConnectionOpen = (endpoint: Endpoint, ...args: any) => {
            server2.sendAsync({content: "foo"}, endpoint);
            return {state: "listening", response: undefined};
        };

        server1 = new WebSocketNode(NODE_1_PORT, {message: [onServerMessage], connection: [onServerConnection]});
        server2 = new WebSocketNode(NODE_2_PORT, {});

        server2.connect("localhost", NODE_1_PORT, {
            message: [onClientMessage],
            open: [onClientConnectionOpen],
        }).then((endpoint) => {
            return;
        });
    });

    //TODO close socket after state "stop" ensure socket is closed in both sides

    afterEach(() => {
        if (server1 !== undefined) {
            server1.stop().then(() => "ok");
        }
        if (server2 !== undefined) {
            server2.stop().then(() => "ok");
        }
    });

});
