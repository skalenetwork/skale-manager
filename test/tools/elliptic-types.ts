declare module "elliptic" {
    type CurvePreset = "secp256k1"
        | "p192"
        | "p224"
        | "p256"
        | "p384"
        | "p521"
        | "curve25519"
        | "ed25519"
    ;

    class EllipticCurve {
        constructor(preset: CurvePreset);
        public genKeyPair(): any;
        public keyFromPublic(publicKey: string, type: "hex"): any;
        public keyFromPrivate(privateKey: string): any;
        public getPublic(privateKey: string): any;
    }

    export { EllipticCurve as ec };
}
