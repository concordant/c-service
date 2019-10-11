import mdns, {Service} from "mdns";

const processURL = (url: string) => {
    const parts = url.split(":");
    return {type: parts[0], port: parts[2].split("/")[0]};
};

export const publishService = (url: string, serviceName: string) => {
    const {type, port} = processURL(url);
    const service = mdns.createAdvertisement(mdns.tcp(type), parseInt(port, 10), {
        name: serviceName,
    });
    service.start();
    console.log("Publishing Service", service);
};

export const dumpNetworkServices = () => {
    const sequence = [
        mdns.rst.DNSServiceResolve(),
        "DNSServiceGetAddrInfo" in mdns.dns_sd ?
            mdns.rst.DNSServiceGetAddrInfo() : mdns.rst.getaddrinfo({families: [4]}),
        mdns.rst.makeAddressesUnique(),
    ];
    const browser = mdns.createBrowser(mdns.tcp("http"), {resolverSequence: sequence});

    browser.on("serviceUp", (service: Service) => {
        console.log("service up: ", service);
    });
    browser.on("serviceDown", (service: Service) => {
        console.log("service down: ", service);
    });
    browser.start();
};
