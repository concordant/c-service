export const promiseDelay = (v: any, t: number) => {
    return new Promise((resolve) =>
        setTimeout(resolve.bind(null, v), t));
};
