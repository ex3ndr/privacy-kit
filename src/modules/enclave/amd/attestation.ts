import { ByteReader } from "../../formats/bytes";

export type AMDAttestationVariant =
    | 'v2'
    | 'v3'
    | 'v3+' // Turin
    ;

export type AMDPlatformInfo = {
    smtEnabled: boolean;
    tsmeEnabled: boolean;
    eccEnabled: boolean;
    raplDisabled: boolean;
    ciphertextHidingEnabled: boolean;
    aliasCheckComplete: boolean;
}

export type AMDAttestation = {
    raw: {
        protected: Uint8Array;
        signature: Uint8Array;
    },
    document: {
        variant: AMDAttestationVariant;
        guestSvn: number;
        guestPolicy: AMDGuestPolicy;
        familyId: Uint8Array;
        imageId: Uint8Array;
        measurement: Uint8Array;
        vmpl: number;
        sigAlgo: number;
        reportData: Uint8Array;
        hostData: Uint8Array;
        idKeyDigest: Uint8Array;
        authorKeyDigest: Uint8Array;
        reportId: Uint8Array;
        reportIdMa: Uint8Array;
        currentTCB: AMDTCBVersion;
        reportedTCB: AMDTCBVersion;
        platformInfo: AMDPlatformInfo;
        cpuInfo: AMDCPUInto;
        committedTCB: AMDTCBVersion;
        currentVersion: AMDVersion;
        committedVersion: AMDVersion;
        launchTcb: AMDTCBVersion;
        signature: AMDSignature;
    }
}

export type AMDTCBVersion = {
    fmc: number | null;
    bootloader: number;
    tee: number;
    snp: number;
    microcode: number;
}

export type AMDVersion = {
    major: number;
    minor: number;
    patch: number;
}

export type AMDGuestPolicy = {
    abiMinor: number;
    abiMajor: number;
    smtAllowed: boolean;
    migrateMaAllowed: boolean;
    debugAllowed: boolean;
    singleSocketRequired: boolean;
    cxlAllowed: boolean;
    memAes256Xts: boolean;
    raplDis: boolean;
    ciphertextHiding: boolean;
}

export type AMDCPUInto = {
    famId: number | null;
    modId: number | null;
    step: number | null;
    chipId: Uint8Array;
}

export type AMDSignature = {
    r: Uint8Array;
    s: Uint8Array;
}

export function parseAttestation(attestation: Uint8Array): AMDAttestation | null {
    if (attestation.length !== 1184) {
        return null;
    }
    const reader = new ByteReader(attestation);

    // Read version
    const version = reader.readUInt32();
    let variant: AMDAttestationVariant;
    if (version === 0 || version === 1) {
        return null
    } else if (version === 2) {
        variant = 'v2';
    } else {
        if (attestation[392] >= 0x1A) {
            variant = 'v3+';
        } else {
            variant = 'v3';
        }
    }

    // Read fields
    const guestSvn = reader.readUInt32();
    const guestPolicy = readGuestPolicy(reader);
    const familyId = reader.readBytes(16);
    const imageId = reader.readBytes(16);
    const vmpl = reader.readUInt32();
    const sig_algo = reader.readUInt32();
    const currentTCB = readTCBVersion(reader, variant);
    const platformInfo = readPlatformInfo(reader);
    const keyInfo = reader.readUInt32();
    reader.skip(4);
    const reportData = reader.readBytes(64);
    const measurement = reader.readBytes(48);
    const hostData = reader.readBytes(32);
    const idKeyDigest = reader.readBytes(48);
    const authorKeyDigest = reader.readBytes(48);
    const reportId = reader.readBytes(32);
    const reportIdMa = reader.readBytes(32);
    const reportedTCB = readTCBVersion(reader, variant);
    const cpuInfo = readCPUInfo(reader, variant);
    const committedTCB = readTCBVersion(reader, variant);
    const currentVersion = readVersion(reader);
    reader.skip(1);
    const committedVersion = readVersion(reader);
    reader.skip(1);
    const launchTcb = readTCBVersion(reader, variant);
    reader.skip(168);
    const signature = readSignature(reader);
    const rawProtected = attestation.slice(0, 672);
    const rawSignature = attestation.slice(672, 672 + 512);

    return {
        raw: {
            protected: rawProtected,
            signature: rawSignature,
        },
        document: {
            variant,
            guestSvn,
            guestPolicy,
            familyId,
            imageId,
            vmpl,
            sigAlgo: sig_algo,
            reportData,
            currentTCB,
            reportedTCB,
            platformInfo,
            measurement,
            hostData,
            idKeyDigest,
            authorKeyDigest,
            reportId,
            reportIdMa,
            cpuInfo,
            committedTCB,
            currentVersion,
            committedVersion,
            launchTcb,
            signature,
        }
    }
}

function readTCBVersion(reader: ByteReader, variant: AMDAttestationVariant): AMDTCBVersion {
    const bytes = reader.readBytes(8);
    if (variant === 'v3+') {
        return {
            fmc: null,
            bootloader: bytes[0],
            tee: bytes[1],
            snp: bytes[6],
            microcode: bytes[7],
        }
    } else {
        return {
            fmc: bytes[0],
            bootloader: bytes[1],
            tee: bytes[2],
            snp: bytes[3],
            microcode: bytes[7],
        }
    }
}

function readVersion(reader: ByteReader): AMDVersion {
    const bytes = reader.readBytes(3);
    return {
        major: bytes[0],
        minor: bytes[1],
        patch: bytes[2],
    }
}

function readGuestPolicy(reader: ByteReader): AMDGuestPolicy {
    const bytes = reader.readBytes(8);
    const value = BigInt(bytes[0]) | (BigInt(bytes[1]) << 8n) | (BigInt(bytes[2]) << 16n) | (BigInt(bytes[3]) << 24n) |
        (BigInt(bytes[4]) << 32n) | (BigInt(bytes[5]) << 40n) | (BigInt(bytes[6]) << 48n) | (BigInt(bytes[7]) << 56n);

    return {
        abiMinor: Number((value >> 7n) & 0xFFn),
        abiMajor: Number((value >> 15n) & 0xFFn),
        smtAllowed: Boolean((value >> 16n) & 1n),
        migrateMaAllowed: Boolean((value >> 18n) & 1n),
        debugAllowed: Boolean((value >> 19n) & 1n),
        singleSocketRequired: Boolean((value >> 20n) & 1n),
        cxlAllowed: Boolean((value >> 21n) & 1n),
        memAes256Xts: Boolean((value >> 22n) & 1n),
        raplDis: Boolean((value >> 23n) & 1n),
        ciphertextHiding: Boolean((value >> 24n) & 1n)
    };
}

function readPlatformInfo(reader: ByteReader): AMDPlatformInfo {
    const bytes = reader.readBytes(8);
    const value = BigInt(bytes[0]) | (BigInt(bytes[1]) << 8n) | (BigInt(bytes[2]) << 16n) | (BigInt(bytes[3]) << 24n) |
        (BigInt(bytes[4]) << 32n) | (BigInt(bytes[5]) << 40n) | (BigInt(bytes[6]) << 48n) | (BigInt(bytes[7]) << 56n);

    return {
        smtEnabled: Boolean(value & 1n),
        tsmeEnabled: Boolean((value >> 1n) & 1n),
        eccEnabled: Boolean((value >> 2n) & 1n),
        raplDisabled: Boolean((value >> 3n) & 1n),
        ciphertextHidingEnabled: Boolean((value >> 4n) & 1n),
        aliasCheckComplete: Boolean((value >> 5n) & 1n)
    };
}

function readCPUInfo(reader: ByteReader, variant: AMDAttestationVariant): AMDCPUInto {
    if (variant === 'v2') {
        reader.skip(24);
        const chipId = reader.readBytes(64);
        return {
            famId: null,
            modId: null,
            step: null,
            chipId,
        }
    } else {
        const famId = reader.readByte();
        const modId = reader.readByte();
        const step = reader.readByte();
        reader.skip(21);
        const chipId = reader.readBytes(64);
        return {
            famId,
            modId,
            step,
            chipId,
        }
    }
}

function readSignature(reader: ByteReader): AMDSignature {
    const r = reader.readBytes(48);
    reader.skip(24);
    const s = reader.readBytes(48);
    reader.skip(24);
    return {
        r,
        s,
    }
}